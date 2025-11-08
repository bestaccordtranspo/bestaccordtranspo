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
  Camera
} from "lucide-react";
import ReceiptGenerator from "../components/InvoiceGenerator";
import { createTruckDivIcon } from '../components/TruckMarkerIcon';

export default function Monitoring() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDestProofModal, setShowDestProofModal] = useState(false);
  const [selectedDestProof, setSelectedDestProof] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Animation variants (keeping your existing ones)
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: (progress) => ({
      width: `${progress}%`,
      transition: {
        duration: 1,
        ease: "easeOut",
        delay: 0.5
      }
    })
  };

  const tableRowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2 }
    },
    hover: {
      backgroundColor: "#f9fafb",
      transition: { duration: 0.2 }
    }
  };

  // Status configuration
  const statusConfig = {
    "Pending": {
      color: "bg-yellow-100 text-yellow-800",
      icon: AlertCircle,
      progress: 20,
      bgColor: "bg-yellow-500",
      step: 0
    },
    "Ready to go": {
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle,
      progress: 40,
      bgColor: "bg-blue-500",
      step: 1
    },
    "On Trip": {
      color: "bg-purple-100 text-purple-800",
      icon: PlayCircle,
      progress: 60,
      bgColor: "bg-purple-500",
      step: 2
    },
    "In Transit": {
      color: "bg-purple-100 text-purple-800",
      icon: PlayCircle,
      progress: 60,
      bgColor: "bg-purple-500",
      step: 2
    },
    "Delivered": {
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      progress: 80,
      bgColor: "bg-green-500",
      step: 3
    },
    "Completed": {
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
      progress: 100,
      bgColor: "bg-gray-500",
      step: 4
    }
  };

  // Timeline steps
  const timelineSteps = [
    { name: "Preparing", status: "Pending" },
    { name: "Ready to go", status: "Ready to go" },
    { name: "On Trip", status: "On Trip" },
    { name: "Delivered", status: "Delivered" },
    { name: "Completed", status: "Completed" }
  ];

  // Helper function to get destinations array
  const getDestinations = (booking) => {
    if (!booking.destinationAddress) return [];
    return Array.isArray(booking.destinationAddress)
      ? booking.destinationAddress
      : [booking.destinationAddress];
  };

  // Helper function to format destinations display
  const formatDestinations = (booking) => {
    const destinations = getDestinations(booking);
    if (destinations.length === 0) return 'No destination';
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
    alert(`Receipt generated successfully! Receipt Number: ${receiptData.receiptNumber}`);
  };

  // Update booking status
  const updateBookingStatus = async (bookingId, newStatus) => {
    setUpdating(true);
    try {
      const response = await fetch(`${baseURL}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedBooking = await response.json();

      // Update local state
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      setSelectedBooking(prev => ({
        ...prev,
        status: newStatus
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
      console.log("🔄 Fetching bookings from API...");

      const response = await fetch(`${baseURL}/api/bookings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Fetched bookings data:", data);

      // Handle both array response and object with bookings array
      const bookingsArray = Array.isArray(data) ? data : (data.bookings || []);

      setBookings(bookingsArray);
      setFilteredBookings(bookingsArray);

      console.log("📊 Total bookings loaded:", bookingsArray.length);

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

    // cleanup previous map
    if (mapInstance.current) {
      try {
        // remove MapLibre map instance
        mapInstance.current.remove();
      } catch (e) { /* ignore */ }
      mapInstance.current = null;
    }

    // Load MapLibre GL script + CSS if needed
    if (!window.maplibregl) {
      const cssId = 'maplibre-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      const scriptId = 'maplibre-script';
      await new Promise((resolve, reject) => {
        if (document.getElementById(scriptId)) {
          // wait for global to be available
          const t = setInterval(() => {
            if (window.maplibregl) { clearInterval(t); resolve(); }
          }, 50);
          return;
        }
        const s = document.createElement('script');
        s.id = scriptId;
        s.src = 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js';
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    }

    // create map + route
    await createMap();
  };

  // IMPROVED: Create map with multiple destination support and ORS routing (MapLibre)
  const createMap = async () => {
    if (!mapRef.current) return;
    const maplibregl = window.maplibregl;
    if (!maplibregl) {
      console.error('MapLibre not available');
      return;
    }

    // basic MapLibre style using OpenStreetMap raster tiles
    const style = {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'raster-tiles'
        }
      ]
    };

    // create map
    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: [120.9842, 14.5995],
      zoom: 6
    });

    // store markers and layers for updates/removal
    mapInstance.current = map;
    mapInstance.current._markers = [];
    mapInstance.current._routeLayerId = 'route-layer';
    mapInstance.current._routeSourceId = 'route-source';

    // helper to clear existing route + markers
    const clearMapData = () => {
      try {
        // remove route layer & source
        if (map.getLayer(mapInstance.current._routeLayerId)) {
          map.removeLayer(mapInstance.current._routeLayerId);
        }
        if (map.getSource(mapInstance.current._routeSourceId)) {
          map.removeSource(mapInstance.current._routeSourceId);
        }
      } catch (e) { /* ignore */ }

      // remove markers
      (mapInstance.current._markers || []).forEach(m => m.remove());
      mapInstance.current._markers = [];
    };

    // Wait for map idle before adding data
    map.on('load', async () => {
      clearMapData();

      // Build ordered coordinates: origin -> destinations...
      const coordsOrder = [];

      // 1) origin coords (prefer stored booking lat/lng)
      if (selectedBooking.latitude && selectedBooking.longitude) {
        coordsOrder.push([selectedBooking.longitude, selectedBooking.latitude]);
      } else if (selectedBooking.originAddress) {
        const originGeo = await geocodeAddress(selectedBooking.originAddress);
        if (originGeo?.coords) {
          // geocodeAddress returns [lat, lng] per your file; convert to [lng, lat]
          coordsOrder.push([originGeo.coords[1], originGeo.coords[0]]);
        }
      }

      // 2) destinations in order (destinationDeliveries preferred, fallback to destinationAddress)
      let destinations = [];
      if (Array.isArray(selectedBooking.destinationDeliveries) && selectedBooking.destinationDeliveries.length > 0) {
        destinations = selectedBooking.destinationDeliveries.map(d => d.destinationAddress);
      } else {
        const d = getDestinations(selectedBooking);
        destinations = d;
      }

      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        if (!dest) continue;
        // try database lookup first (your fetchClientCoordinates exists inside createMap previously)
        let destGeo = null;
        try {
          const dbResp = await fetch(`${baseURL}/api/clients/by-address?address=${encodeURIComponent(dest)}`);
          if (dbResp.ok) {
            const client = await dbResp.json();
            if (client?.address?.latitude && client?.address?.longitude) {
              destGeo = { coords: [client.address.latitude, client.address.longitude], source: 'database' };
            }
          }
        } catch (e) { /* ignore */ }

        if (!destGeo) {
          const g = await geocodeAddress(dest);
          if (g?.coords) destGeo = { coords: g.coords, source: 'geocoding' };
        }

        if (destGeo && destGeo.coords) {
          coordsOrder.push([destGeo.coords[1], destGeo.coords[0]]); // [lng, lat]
        }
      }

      // If not enough points to route, just place markers
      if (coordsOrder.length < 2) {
        // place markers for what we have
        coordsOrder.forEach((lnglat, idx) => {
          const el = document.createElement('div');
          el.className = 'map-marker-number';
          el.style.width = '28px';
          el.style.height = '28px';
          el.style.borderRadius = '14px';
          el.style.background = idx === 0 ? '#10b981' : '#ef4444';
          el.style.color = '#fff';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '12px';
          el.style.fontWeight = '700';
          el.innerText = `${idx + 1}`;

          const marker = new maplibregl.Marker({ element: el }).setLngLat(lnglat).addTo(map);
          mapInstance.current._markers.push(marker);
        });
        if (coordsOrder.length === 1) map.setCenter(coordsOrder[0]);
        return;
      }

      // Call OpenRouteService Directions API (geojson) - requires VITE_ORS_API_KEY
      const orsKey = import.meta.env.VITE_ORS_API_KEY;
      if (!orsKey) {
        console.error('VITE_ORS_API_KEY not set. Route drawing requires an OpenRouteService API key.');
        return;
      }

      const body = {
        coordinates: coordsOrder,
        instructions: false,
        geometry: true,
        units: 'm'
      };

      try {
        const resp = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': orsKey
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`ORS error ${resp.status}: ${txt}`);
        }

        const data = await resp.json();
        // ORS returns FeatureCollection with features[0] containing geometry (GeoJSON LineString)
        const routeFeature = data?.features?.[0];
        const distanceMeters = routeFeature?.properties?.summary?.distance ?? null; // meters
        const durationSeconds = routeFeature?.properties?.summary?.duration ?? null;

        // add source + layer
        if (map.getSource(mapInstance.current._routeSourceId)) {
          map.removeLayer(mapInstance.current._routeLayerId);
          map.removeSource(mapInstance.current._routeSourceId);
        }

        map.addSource(mapInstance.current._routeSourceId, {
          type: 'geojson',
          data: routeFeature
        });

        map.addLayer({
          id: mapInstance.current._routeLayerId,
          type: 'line',
          source: mapInstance.current._routeSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#2563eb',
            'line-width': 6,
            'line-opacity': 0.9
          }
        });

        // Add numbered markers for origin + stops (in order)
        coordsOrder.forEach((lnglat, idx) => {
          const el = document.createElement('div');
          el.className = 'map-marker-number';
          el.style.width = '34px';
          el.style.height = '34px';
          el.style.borderRadius = '18px';
          el.style.background = idx === 0 ? '#10b981' : '#ef4444';
          el.style.color = '#fff';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '13px';
          el.style.fontWeight = '700';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
          el.innerText = `${idx + 1}`;

          const marker = new maplibregl.Marker({ element: el }).setLngLat(lnglat).addTo(map);
          mapInstance.current._markers.push(marker);
        });

        // Add truck marker if driver location exists
        if (selectedBooking.driverLocation?.latitude && selectedBooking.driverLocation?.longitude) {
          const truckEl = document.createElement('div');
          truckEl.style.width = '36px';
          truckEl.style.height = '36px';
          truckEl.style.borderRadius = '18px';
          truckEl.style.background = '#f97316';
          truckEl.style.display = 'flex';
          truckEl.style.alignItems = 'center';
          truckEl.style.justifyContent = 'center';
          truckEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          truckEl.innerHTML = '🚚';

          const truckLngLat = [selectedBooking.driverLocation.longitude, selectedBooking.driverLocation.latitude];
          const truckMarker = new maplibregl.Marker({ element: truckEl }).setLngLat(truckLngLat).addTo(map);
          mapInstance.current._markers.push(truckMarker);
        }

        // fit to route bounds
        const coords = routeFeature.geometry.coordinates;
        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });

        // expose route distance on selectedBooking UI (store on selectedBooking for display)
        if (distanceMeters != null) {
          // attach to state copy so UI can read it
          setSelectedBooking(prev => prev ? ({ ...prev, routeDistanceMeters: distanceMeters, routeDurationSeconds: durationSeconds }) : prev);
        }
      } catch (err) {
        console.error('Routing error (ORS):', err);
      }
    });

    // Force resize / invalidate after short delay
    setTimeout(() => {
      try { map.resize(); } catch (e) { /* ignore */ }
    }, 120);
  };

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => {
        const destinations = getDestinations(booking);
        return (
          booking.tripNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.reservationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          destinations.some(dest => dest?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings]);

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
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get unique statuses
  const uniqueStatuses = ["All", ...new Set(bookings.map(b => b.status || "Pending"))];

  // Get current step for timeline
  const getCurrentStep = (status) => {
    return statusConfig[status]?.step || 0;
  };

  // Helper function to get employee display name
  const getEmployeeDisplayName = (employeeId, employeeDetails) => {
    if (employeeDetails && employeeDetails.length > 0) {
      const emp = employeeDetails.find(e => e.employeeId === employeeId);
      return emp ? (emp.employeeName || emp.fullName || emp.name) : employeeId;
    }
    return employeeId || 'Unknown';
  };

  // Handle confirm ready to go
  const handleConfirmReadyToGo = () => {
    if (selectedBooking) {
      updateBookingStatus(selectedBooking._id, "Ready to go");
    }
  };

  return (
    <>
      {/* Add Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

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
            <p className="text-gray-600 text-sm">Track and manage ongoing trips and delivery status</p>
          </div>

          <motion.button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
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

            return (
              <motion.div
                key={status}
                className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{status}</p>
                    <motion.p
                      className="text-2xl font-bold text-gray-800"
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
                    <StatusIcon className="w-8 h-8 text-purple-400" />
                  </motion.div>
                </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                          whileHover={{ backgroundColor: "rgba(147, 51, 234, 0.05)" }}
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
                                <span className="truncate max-w-[150px]">{booking.originAddress}</span>
                              </div>
                              {destinations.map((dest, idx) => (
                                <div key={idx} className="flex items-center text-red-600 mt-1">
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {destinations.length > 1 && `(${idx + 1}) `}{dest}
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
                                  transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
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
                              {new Date(booking.dateNeeded).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {booking.timeNeeded}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {booking.employeeAssigned && booking.employeeAssigned.length > 0 ? (
                                booking.employeeAssigned.slice(0, 2).map((empId, idx) => (
                                  <motion.span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.05 + 0.3 + idx * 0.1 }}
                                  >
                                    {getEmployeeDisplayName(empId, booking.employeeDetails)}
                                  </motion.span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">Not assigned</span>
                              )}
                              {booking.employeeAssigned && booking.employeeAssigned.length > 2 && (
                                <span className="text-xs text-gray-500">+{booking.employeeAssigned.length - 2}</span>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
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
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)' }}
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
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Trip Monitoring</h3>
                  <p className="text-sm text-gray-600">Track and manage ongoing trips and delivery status</p>
                </div>
                <motion.button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
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
                              const currentStep = getCurrentStep(selectedBooking.status || "Pending");
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
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-white ${isActive ? 'bg-purple-600 border-purple-600 text-white' :
                                      isCompleted ? 'bg-purple-600 border-purple-600 text-white' :
                                        'border-gray-300 text-gray-400'
                                      }`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    {isCompleted || isActive ? <CheckCircle className="w-5 h-5" /> : <div className="w-3 h-3 rounded-full bg-current" />}
                                  </motion.div>
                                  <motion.span
                                    className={`text-xs mt-2 font-medium text-center ${isActive || isCompleted ? 'text-purple-600' : 'text-gray-500'
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
                                      className={`absolute top-5 h-0.5 ${isCompleted ? 'bg-purple-600' : 'bg-gray-300'
                                        }`}
                                      style={{
                                        left: '50%',
                                        right: '-50%',
                                        width: '100%'
                                      }}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ delay: 0.7 + index * 0.1, duration: 0.3 }}
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
                          style={{ minHeight: '400px' }}
                        >
                          <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                              <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              </motion.div>
                              <p className="text-gray-500 text-sm">Loading route map...</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                        {/* Route Timeline - FUNCTIONAL */}
                        <motion.div
                          className="bg-white rounded-lg border border-gray-200 p-6"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          {/* Header with Stats */}
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-gray-900 text-lg">Route Timeline</h3>
                            {selectedBooking.destinationDeliveries?.length > 1 && (() => {
                              const delivered = selectedBooking.destinationDeliveries.filter(d => d.status === 'delivered').length;
                              const total = selectedBooking.destinationDeliveries.length;
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
                                  <p className="text-sm font-semibold text-gray-900">Trip Started</p>
                                  <span className="text-xs text-gray-500">
                                    {new Date(selectedBooking.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {new Date(selectedBooking.dateNeeded).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} at {selectedBooking.timeNeeded}
                                </p>
                              </div>
                            </div>

                            {/* Origin */}
                            <div className="flex items-start space-x-4">
                              <div className="relative flex flex-col items-center">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center z-10">
                                  <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div className="w-0.5 h-full bg-gray-200 absolute top-10"></div>
                              </div>
                              <div className="flex-1 pb-8">
                                <p className="text-sm font-semibold text-gray-900">Picked up from Origin</p>
                                <p className="text-sm text-gray-600">{selectedBooking.originAddress}</p>
                              </div>
                            </div>

                              {/* FUNCTIONAL Destinations */}
                              {selectedBooking.destinationDeliveries && selectedBooking.destinationDeliveries.length > 0 ? (
                                selectedBooking.destinationDeliveries.map((dest, index) => {
                                  const isLast = index === selectedBooking.destinationDeliveries.length - 1;
                                  const isDelivered = dest.status === 'delivered';
                                  const hasMultiple = selectedBooking.destinationDeliveries.length > 1;
                                  
                                  return (
                                    <div key={index} className="flex items-start space-x-4">
                                      <div className="relative flex flex-col items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                          isDelivered ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                          {isDelivered ? (
                                            <CheckCircle className="w-5 h-5 text-white" />
                                          ) : (
                                            <Clock className="w-5 h-5 text-white" />
                                          )}
                                        </div>
                                        {!isLast && (
                                          <div className={`w-0.5 h-full absolute top-10 ${
                                            isDelivered ? 'bg-green-200' : 'bg-gray-200'
                                          }`}></div>
                                        )}
                                      </div>
                                      <div className="flex-1 pb-8">
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-sm font-semibold text-gray-900">
                                            {hasMultiple ? `Destination ${index + 1}` : 'Destination'}
                                            {isDelivered && (
                                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                                ✓ Delivered
                                              </span>
                                            )}
                                          </p>
                                          {isDelivered && dest.deliveredAt && (
                                            <span className="text-xs text-gray-500">
                                              {new Date(dest.deliveredAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600">{dest.destinationAddress}</p>
                                        
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
                                                    address: dest.destinationAddress,
                                                    deliveredAt: dest.deliveredAt,
                                                    index: index + 1,
                                                    notes: dest.notes
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
                                            {selectedBooking.status === 'In Transit' 
                                              ? 'Awaiting delivery...' 
                                              : 'Pending delivery'}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                );
                              })
                            ) : (
                              // Fallback for old bookings
                              <div className="flex items-start space-x-4">
                                <div className="relative flex flex-col items-center">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                    selectedBooking.status === 'Delivered' || selectedBooking.status === 'Completed'
                                      ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {selectedBooking.status === 'Delivered' || selectedBooking.status === 'Completed' ? (
                                      <CheckCircle className="w-5 h-5 text-white" />
                                    ) : (
                                      <Clock className="w-5 h-5 text-white" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 pb-8">
                                  <p className="text-sm font-semibold text-gray-900">Destination</p>
                                  <p className="text-sm text-gray-600">
                                    {Array.isArray(selectedBooking.destinationAddress) 
                                      ? selectedBooking.destinationAddress.join(', ') 
                                      : selectedBooking.destinationAddress}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Completed Status */}
                            {selectedBooking.status === 'Completed' && (
                              <div className="flex items-start space-x-4">
                                <div className="relative flex flex-col items-center">
                                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center z-10">
                                    <FileText className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold text-gray-900">Trip Completed</p>
                                    <span className="text-xs text-gray-500">
                                      {new Date(selectedBooking.updatedAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">All deliveries completed successfully</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Progress Summary */}
                          {selectedBooking.destinationDeliveries?.length > 1 && selectedBooking.status === 'In Transit' && (() => {
                            const delivered = selectedBooking.destinationDeliveries.filter(d => d.status === 'delivered').length;
                            const total = selectedBooking.destinationDeliveries.length;
                            return (
                              <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-gray-600">Delivery Progress</span>
                                  <span className="font-semibold text-gray-900">
                                    {delivered} of {total} destinations
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(delivered / total) * 100}%` }}
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
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Customer Name</h4>
                            <p className="text-gray-900">{selectedBooking.customerEstablishmentName || selectedBooking.shipperConsignorName || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Company</h4>
                            <p className="text-gray-900">{selectedBooking.companyName}</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Product Details */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Item</h4>
                            <p className="text-gray-900">{selectedBooking.productName}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Quantity</h4>
                            <p className="text-gray-900">{selectedBooking.quantity?.toLocaleString()} pcs</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Gross Weight</h4>
                            <p className="text-gray-900">{selectedBooking.grossWeight} tons</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Units per package</h4>
                            <p className="text-gray-900">{selectedBooking.unitPerPackage}pcs/box</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Number of Package</h4>
                            <p className="text-gray-900">{selectedBooking.numberOfPackages} box</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Delivery Fee</h4>
                            <p className="text-gray-900">₱{selectedBooking.deliveryFee?.toLocaleString()} PHP</p>
                          </div>
                        </div>
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
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Vehicle Type</h4>
                            <p className="text-gray-900">{selectedBooking.vehicleType}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Vehicle Plate</h4>
                            <p className="text-gray-900">{selectedBooking.plateNumber}</p>
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
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Origin Location</h4>
                            <p className="text-gray-900">{selectedBooking.originAddress}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              {getDestinations(selectedBooking).length > 1 ? 'Destinations' : 'Destination'}
                            </h4>
                            <div className="space-y-2">
                              {getDestinations(selectedBooking).map((dest, idx) => (
                                <div key={idx} className="flex items-start">
                                  {getDestinations(selectedBooking).length > 1 && (
                                    <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded mr-2 mt-0.5">
                                      {idx + 1}
                                    </span>
                                  )}
                                  <p className="text-gray-900 flex-1">{dest}</p>
                                </div>
                              ))}
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
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Drivers</h4>
                            <div className="space-y-2">
                              {selectedBooking.employeeDetails?.filter(emp =>
                                emp.role === 'Driver'
                              ).map((driver, idx) => (
                                <motion.div
                                  key={idx}
                                  className="flex items-center space-x-2"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.9 + idx * 0.1 }}
                                >
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">
                                    {driver.employeeName || driver.fullName || 'Unknown Driver'}
                                  </span>
                                </motion.div>
                              ))}

                              {/* If no drivers found, check employeeAssigned array */}
                              {(!selectedBooking.employeeDetails ||
                                selectedBooking.employeeDetails.filter(emp => emp.role === 'Driver').length === 0) &&
                                selectedBooking.employeeAssigned && selectedBooking.employeeAssigned.length > 0 && (
                                  selectedBooking.employeeAssigned.map((empId, idx) => (
                                    <motion.div
                                      key={idx}
                                      className="flex items-center space-x-2"
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.9 + idx * 0.1 }}
                                    >
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-900">
                                        {getEmployeeDisplayName(empId, selectedBooking.employeeDetails)}
                                      </span>
                                    </motion.div>
                                  ))
                                )}

                              {(!selectedBooking.employeeDetails || selectedBooking.employeeDetails.length === 0) &&
                                (!selectedBooking.employeeAssigned || selectedBooking.employeeAssigned.length === 0) && (
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">Not assigned</span>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Helpers</h4>
                            <div className="space-y-2">
                              {selectedBooking.employeeDetails?.filter(emp =>
                                emp.role === 'Helper'
                              ).map((helper, idx) => (
                                <motion.div
                                  key={idx}
                                  className="flex items-center space-x-2"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1.0 + idx * 0.1 }}
                                >
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">
                                    {helper.employeeName || helper.fullName || 'Unknown Helper'}
                                  </span>
                                </motion.div>
                              ))}

                              {(!selectedBooking.employeeDetails ||
                                selectedBooking.employeeDetails.filter(emp => emp.role === 'Helper').length === 0) && (
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">Not assigned</span>
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
                          <motion.button
                            onClick={handleConfirmReadyToGo}
                            disabled={updating}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={!updating ? { scale: 1.02 } : {}}
                            whileTap={!updating ? { scale: 0.98 } : {}}
                          >
                            {updating ? "Updating..." : "Confirm Ready to go"}
                          </motion.button>
                        )}

                        {selectedBooking.status === "Ready to go" && (
                          <div className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-center">
                            ✓ Ready for Driver to Start Trip
                          </div>
                        )}

                        {(selectedBooking.status === "On Trip" || selectedBooking.status === "In Transit") && (
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
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
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
                    <p className="text-sm text-purple-100">Trip: {selectedBooking.tripNumber}</p>
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
                          {getDestinations(selectedBooking).length > 1 && `${idx + 1}. `}{dest}
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
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
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
                      <h3 className="text-lg font-bold">Delivery Proof - Stop {selectedDestProof.index}</h3>
                      <p className="text-sm text-green-100">Trip: {selectedBooking.tripNumber}</p>
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
                      <p className="text-sm font-medium">{selectedDestProof.address}</p>
                    </div>
                    
                    {selectedDestProof.deliveredAt && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Delivery Time</p>
                        <p className="text-sm font-medium">
                          {new Date(selectedDestProof.deliveredAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedDestProof.notes && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Delivery Notes</p>
                        <p className="text-sm font-medium">{selectedDestProof.notes}</p>
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
            </>
  );
}
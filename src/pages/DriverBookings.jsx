// src/pages/DriverBookings.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  Users,
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  X,
  User,
  Play,
  Building,
  ChevronDown,
  ChevronUp,
  Phone,
  Weight,
  Award,
  Camera,
  RotateCcw,
  Check
} from "lucide-react";
import { axiosClient } from "../api/axiosClient";
import driverloginbg from "../assets/driver_login_bg.png";
import { createTruckDivIcon } from '../components/TruckMarkerIcon';

export default function DriverBookings() {
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [selectedDestinationIndex, setSelectedDestinationIndex] = useState(null);
  const [destinationNotes, setDestinationNotes] = useState('');
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [selectedDeliveryDestination, setSelectedDeliveryDestination] = useState(null);
  const locationIntervalRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    route: true,
    cargo: false,
    customer: false,
    team: false
  });

  // Function to get current location with improved error handling

  const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

const updateLocationOnServer = async (bookingId, location) => {
  try {
    const token = localStorage.getItem("driverToken");
    
    console.log("📍 Updating location on server:", {
      bookingId,
      location
    });
    
    const response = await axiosClient.put(
      `/api/driver/bookings/${bookingId}/location`,
      {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      console.log("✅ Location updated successfully on server:", response.data.location);
      setDriverLocation(location);
      setLocationError(null);
      
      // UPDATE LOCAL STATE so monitoring can see it
      setSelectedBooking(prev => ({
        ...prev,
        driverLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          lastUpdated: new Date(),
          accuracy: location.accuracy
        }
      }));
      
      return true;
    }
  } catch (err) {
    console.error("❌ Error updating location:", err);
    setLocationError(err.response?.data?.msg || "Failed to update location");
    return false;
  }
};

// Start periodic location updates
const startLocationTracking = async (bookingId) => {
  console.log("📍 Starting location tracking for booking:", bookingId);
  
  try {
    // Get initial location immediately
    const location = await getCurrentLocation();
    console.log("📍 Initial location obtained:", location);
    
    // Update server immediately
    const success = await updateLocationOnServer(bookingId, location);
    
    if (!success) {
      console.warn("⚠️ Initial location update failed");
    }
    
    // Clear any existing interval
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    
    // Set up periodic updates every 5 minutes (300000 ms)
    locationIntervalRef.current = setInterval(async () => {
      try {
        console.log("📍 Periodic location update triggered");
        const newLocation = await getCurrentLocation();
        await updateLocationOnServer(bookingId, newLocation);
      } catch (err) {
        console.error("❌ Error in periodic location update:", err);
        setLocationError(err.message);
      }
    }, 300000); // 5 minutes
    
    console.log("✅ Location tracking started successfully");
    
  } catch (err) {
    console.error("❌ Error getting initial location:", err);
    setLocationError(err.message);
    alert(`Location Error: ${err.message}\n\nPlease enable location permissions in your browser settings.`);
  }
};

// Stop location tracking
const stopLocationTracking = () => {
  if (locationIntervalRef.current) {
    clearInterval(locationIntervalRef.current);
    locationIntervalRef.current = null;
    console.log("📍 Location tracking stopped");
  }
};
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

const getDestinations = (booking) => {
  if (!booking.destinationAddress) return [];
  return Array.isArray(booking.destinationAddress) 
    ? booking.destinationAddress 
    : [booking.destinationAddress];
};

  const statusColors = {
    "Pending": { bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertCircle },
    "Ready to go": { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle2 },
    "On Trip": { bg: "bg-purple-100", text: "text-purple-800", icon: PlayCircle },
    "In Transit": { bg: "bg-purple-100", text: "text-purple-800", icon: PlayCircle },
    "Delivered": { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
    "Completed": { bg: "bg-gray-100", text: "text-gray-800", icon: Award }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

// Camera functions
  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported on this device/browser. Try using HTTPS.");
        setTimeout(() => setError(""), 5000);
        return;
      }

      // Mobile-optimized constraints - lower resolution for smaller file size
      let mediaStream;
      try {
        // First try with rear camera (ideal for mobile) with optimized resolution
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            aspectRatio: { ideal: 16/9 }
          },
          audio: false 
        });
      } catch (err) {
        console.log("Rear camera not available, trying any camera...");
        // Fallback: try any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            aspectRatio: { ideal: 16/9 }
          },
          audio: false 
        });
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for the video element to be ready
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          // Add event listeners for mobile
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.setAttribute('muted', 'true');
          videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
            setError("Could not start camera preview.");
            setTimeout(() => setError(""), 3000);
          });
        }
      }, 200);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMsg = "Unable to access camera. ";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg += "Please allow camera permissions.";
      } else if (err.name === 'NotFoundError') {
        errorMsg += "No camera found on device.";
      } else if (err.name === 'NotReadableError') {
        errorMsg += "Camera is already in use by another app.";
      } else {
        errorMsg += "Please check permissions and try again.";
      }
      setError(errorMsg);
      setTimeout(() => setError(""), 5000);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const initializeMap = async () => {
    if (!selectedBooking || !mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    try {
      if (window.L) {
        createMap();
      } else {
        const leafletScript = document.createElement('script');
        leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletScript.onload = createMap;
        document.head.appendChild(leafletScript);
      }
    } catch (error) {
      console.error('Error loading map:', error);
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
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: (route.distance / 1000).toFixed(2), // km
            duration: Math.round(route.duration / 60), // minutes
          };
        }
      } catch (error) {
        console.error('OSRM routing error:', error);
        return null;
      }
    };

const createMap = async () => {
  if (!mapRef.current) return;

  const L = window.L;
  const map = L.map(mapRef.current).setView([14.5995, 120.9842], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // IMPROVED: Geocoding with fallback strategies
  const geocodeAddress = async (address, retryLevel = 0) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      let searchQuery = address;
      
      if (retryLevel === 0) {
        searchQuery = `${address}, Philippines`;
      } else if (retryLevel === 1) {
        const cityMatch = address.match(/City of ([^,]+)|Taguig|Makati|Manila|Quezon City|Pasig|Mandaluyong|Pasay|Parañaque|Las Piñas|Muntinlupa|Caloocan|Malabon|Navotas|Valenzuela|San Juan|Marikina|Pateros/i);
        if (cityMatch) {
          const city = cityMatch[1] || cityMatch[0];
          searchQuery = `${city}, Metro Manila, Philippines`;
        }
      } else if (retryLevel === 2) {
        if (address.toLowerCase().includes('metro manila') || address.toLowerCase().includes('ncr')) {
          searchQuery = 'Metro Manila, Philippines';
        }
      }
      
      console.log(`🔍 Geocoding attempt ${retryLevel + 1}: "${searchQuery}"`);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ph&limit=3`,
        {
          headers: {
            'User-Agent': 'BestAccord-Driver-App'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        console.log(`✅ Geocoded "${address}":`, data[0]);
        return {
          coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
          displayName: data[0].display_name,
          confidence: retryLevel === 0 ? 'high' : retryLevel === 1 ? 'medium' : 'low'
        };
      } else if (retryLevel < 2) {
        console.warn(`⚠️ No results for "${searchQuery}", trying fallback...`);
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

  // OSRM Routing function to get actual road routes
  const getRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
          distance: (route.distance / 1000).toFixed(2), // km
          duration: Math.round(route.duration / 60), // minutes
        };
      }
    } catch (error) {
      console.error('OSRM routing error:', error);
      return null;
    }
  };

  // Hardcoded coordinates for common Metro Manila areas as fallback
  const getHardcodedCoordinates = (address) => {
    const lowerAddress = address.toLowerCase();
    
    if (lowerAddress.includes('taguig')) {
      return { coords: [14.5176, 121.0509], displayName: 'Taguig City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('makati')) {
      return { coords: [14.5547, 121.0244], displayName: 'Makati City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('manila') && !lowerAddress.includes('metro')) {
      return { coords: [14.5995, 120.9842], displayName: 'Manila City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('quezon')) {
      return { coords: [14.6760, 121.0437], displayName: 'Quezon City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('pasig')) {
      return { coords: [14.5764, 121.0851], displayName: 'Pasig City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('mandaluyong')) {
      return { coords: [14.5794, 121.0359], displayName: 'Mandaluyong City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('pasay')) {
      return { coords: [14.5378, 121.0014], displayName: 'Pasay City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('parañaque') || lowerAddress.includes('paranaque')) {
      return { coords: [14.4793, 121.0198], displayName: 'Parañaque City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('las piñas') || lowerAddress.includes('las pinas')) {
      return { coords: [14.4453, 120.9831], displayName: 'Las Piñas City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('muntinlupa')) {
      return { coords: [14.3754, 121.0359], displayName: 'Muntinlupa City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('caloocan')) {
      return { coords: [14.6507, 120.9674], displayName: 'Caloocan City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('malabon')) {
      return { coords: [14.6622, 120.9570], displayName: 'Malabon City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('navotas')) {
      return { coords: [14.6684, 120.9387], displayName: 'Navotas City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('valenzuela')) {
      return { coords: [14.7001, 120.9828], displayName: 'Valenzuela City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('san juan')) {
      return { coords: [14.6019, 121.0355], displayName: 'San Juan City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('marikina')) {
      return { coords: [14.6507, 121.1029], displayName: 'Marikina City', confidence: 'fallback' };
    }
    if (lowerAddress.includes('pateros')) {
      return { coords: [14.5445, 121.0658], displayName: 'Pateros', confidence: 'fallback' };
    }
    
    console.log(`📍 Using default Metro Manila coordinates`);
    return { coords: [14.5995, 120.9842], displayName: 'Metro Manila', confidence: 'default' };
  };

  const allCoordinates = [];

  try {
  // Helper function to fetch client coordinates from database
    const fetchClientCoordinates = async (address) => {
      try {
        console.log(`🔍 Fetching coordinates from database for: "${address}"`);
        const response = await axiosClient.get(`/api/clients/by-address?address=${encodeURIComponent(address)}`);

        if (response.data && response.data.address?.latitude && response.data.address?.longitude) {
          console.log(`✅ Found coordinates in database: [${response.data.address.latitude}, ${response.data.address.longitude}]`);
          return {
            coords: [response.data.address.latitude, response.data.address.longitude],
            displayName: address,
            confidence: 'exact',
            source: 'database'
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching client coordinates:', error);
        return null;
      }
    };

    // Add origin marker with priority: booking coords -> database -> geocoding
    let originResult = null;
    if (selectedBooking.originAddress) {
      // PRIORITY 1: Check booking coordinates first
      if (selectedBooking.latitude && selectedBooking.longitude) {
        originResult = {
          coords: [selectedBooking.latitude, selectedBooking.longitude],
          displayName: selectedBooking.originAddress,
          confidence: 'exact',
          source: 'booking'
        };
        console.log('✅ Using stored origin coordinates from booking');
      } 
      // PRIORITY 2: Try client database
      else {
        originResult = await fetchClientCoordinates(selectedBooking.originAddress);
      }

      // PRIORITY 3: Fallback to geocoding
      if (!originResult) {
        console.log(`⚠️ No stored coordinates for origin, using geocoding...`);
        originResult = await geocodeAddressForRoute(selectedBooking.originAddress);
      }

      if (originResult && originResult.coords) {
        allCoordinates.push(originResult.coords);
        
        const confidenceText = originResult.source === 'database'
          ? '✓ Exact location (from database)'
          : originResult.confidence === 'high'
          ? '✓ Geocoded (high accuracy)'
          : originResult.confidence === 'medium'
          ? '⚠️ Approximate area'
          : originResult.confidence === 'fallback'
          ? '📍 City center (approximate)'
          : '📍 General area';

        L.circleMarker(originResult.coords, {
          radius: 10,
          fillColor: '#10b981',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map).bindPopup(`
          <div style="min-width: 150px;">
            <strong style="color: #10b981;">📍 Origin</strong><br/>
            <p style="margin: 4px 0; font-size: 11px;">${selectedBooking.originAddress}</p>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #6b7280;">${confidenceText}</p>
          </div>
        `);
      }
        }

    // Get all destinations
    const destinations = getDestinations(selectedBooking);
    
    // Add destination markers
    for (let i = 0; i < destinations.length; i++) {
      const destAddress = destinations[i];
      if (destAddress) {
        let destResult = null;
        
        // PRIORITY 1: Check if destination has stored coordinates in destinationDeliveries
        if (selectedBooking.destinationDeliveries && selectedBooking.destinationDeliveries[i]) {
          const dest = selectedBooking.destinationDeliveries[i];
          if (dest.latitude && dest.longitude) {
            destResult = {
              coords: [dest.latitude, dest.longitude],
              displayName: destAddress,
              confidence: 'exact',
              source: 'booking'
            };
            console.log(`✅ Using stored destination coordinates from booking for stop ${i + 1}`);
          }
        }
        
        // PRIORITY 2: Try branch database
        if (!destResult) {
          destResult = await fetchClientCoordinates(destAddress);
        }

        // PRIORITY 3: Fallback to geocoding
        if (!destResult) {
          console.log(`⚠️ No stored coordinates for "${destAddress}", using geocoding...`);
          destResult = await geocodeAddressForRoute(destAddress);
        }

        if (destResult && destResult.coords) {
          allCoordinates.push(destResult.coords);

          const colors = [
            { fill: '#ef4444', name: 'red' },
            { fill: '#f59e0b', name: 'amber' },
            { fill: '#8b5cf6', name: 'purple' },
            { fill: '#ec4899', name: 'pink' },
            { fill: '#06b6d4', name: 'cyan' }
          ];
          const color = colors[i % colors.length];
          
          const stopLabel = destinations.length > 1 ? `Stop ${i + 1}` : 'Destination';
          
          const confidenceText = destResult.source === 'database'
            ? '✓ Exact location (from database)'
            : destResult.confidence === 'high'
            ? '✓ Geocoded (high accuracy)'
            : destResult.confidence === 'medium'
            ? '⚠️ Approximate area'
            : destResult.confidence === 'fallback'
            ? '📍 City center (approximate)'
            : '📍 General area';

          L.circleMarker(destResult.coords, {
            radius: 10,
            fillColor: color.fill,
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map).bindPopup(`
            <div style="min-width: 150px;">
              <strong style="color: ${color.fill};">📍 ${stopLabel}</strong><br/>
              <p style="margin: 4px 0; font-size: 11px;">${destAddress}</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #6b7280;">${confidenceText}</p>
            </div>
          `);

          // Draw OSRM route line from origin to each destination
          if (originResult && originResult.coords) {
            const route = await getRoute(originResult.coords, destResult.coords);
            
            if (route && route.coordinates) {
              console.log(`🗺️ OSRM route to destination ${i + 1}: ${route.distance}km, ${route.duration}min`);
              
              // Draw the actual road route
              L.polyline(route.coordinates, {
                color: color.fill,
                weight: 4,
                opacity: 0.8,
              }).addTo(map);
              
              // Add distance label
              const midpoint = route.coordinates[Math.floor(route.coordinates.length / 2)];
              L.marker(midpoint, {
                icon: L.divIcon({
                  className: 'route-label',
                  html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; border: 2px solid ${color.fill}; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap;">
                          ${route.distance}km • ${route.duration}min
                        </div>`,
                  iconSize: [100, 30],
                  iconAnchor: [50, 15]
                })
              }).addTo(map);
            } else {
              // Fallback to straight line if OSRM fails
              console.log(`⚠️ OSRM routing failed for destination ${i + 1}, using straight line`);
              L.polyline([originResult.coords, destResult.coords], {
                color: color.fill,
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5'
              }).addTo(map);
            }
          }
        }
      }
    }

    // Add driver's current location marker (truck icon)
    if (selectedBooking.driverLocation && 
        selectedBooking.driverLocation.latitude && 
        selectedBooking.driverLocation.longitude) {
      
      const driverCoords = [
        selectedBooking.driverLocation.latitude, 
        selectedBooking.driverLocation.longitude
      ];
      
      allCoordinates.push(driverCoords);

      // Create custom truck icon
      const truckIcon = createTruckDivIcon(L, '#3B82F6'); // Blue truck

      // Add truck marker
      const truckMarker = L.marker(driverCoords, { 
        icon: truckIcon,
        zIndexOffset: 1000 // Ensure truck appears on top
      }).addTo(map);

      // Format last updated time
      const lastUpdated = selectedBooking.driverLocation.lastUpdated 
        ? new Date(selectedBooking.driverLocation.lastUpdated).toLocaleString()
        : 'Unknown';

      const accuracy = selectedBooking.driverLocation.accuracy 
        ? `±${Math.round(selectedBooking.driverLocation.accuracy)}m`
        : 'Unknown';

      truckMarker.bindPopup(`
        <div style="min-width: 180px;">
          <strong style="color: #3B82F6; font-size: 14px;">🚚 Your Location</strong><br/>
          <p style="margin: 8px 0 4px 0; font-size: 11px;">
            <strong>Coordinates:</strong><br/>
            ${driverCoords[0].toFixed(6)}, ${driverCoords[1].toFixed(6)}
          </p>
          <p style="margin: 4px 0; font-size: 10px; color: #6b7280;">
            <strong>Last Updated:</strong> ${lastUpdated}
          </p>
          <p style="margin: 4px 0; font-size: 10px; color: #6b7280;">
            <strong>Accuracy:</strong> ${accuracy}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: #059669;">
            ✓ Real-time GPS tracking
          </p>
        </div>
      `);

      // Add accuracy circle around driver location
      if (selectedBooking.driverLocation.accuracy) {
        L.circle(driverCoords, {
          radius: selectedBooking.driverLocation.accuracy,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
          weight: 1,
          opacity: 0.3
        }).addTo(map);
      }
    }

    // Fit map to show all markers
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates);
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 14
      });
    } else {
      map.setView([14.5995, 120.9842], 10);
    }
  } catch (error) {
    console.error('Error creating map markers:', error);
  }

  mapInstance.current = map;
};

  const startTrip = async () => {
    if (!selectedBooking) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("driverToken");

      // Update booking status to In Transit
      const response = await axiosClient.put(
        `/api/driver/bookings/${selectedBooking._id}/status`,
        { status: "In Transit" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking._id === selectedBooking._id
              ? { ...booking, status: "In Transit", originPickedUp: false }
              : booking
          )
        );

        setSelectedBooking(prev => ({
          ...prev,
          status: "In Transit",
          originPickedUp: false
        }));

        console.log("✅ Trip started, now en route to origin for pickup");
        
        await startLocationTracking(selectedBooking._id);
        
        alert("Trip started! Navigate to origin to pick up cargo. Your location will be tracked every 5 minutes.");
      }
    } catch (err) {
      console.error("❌ Error starting trip:", err);
      setError("Failed to start trip. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const markAsDelivered = async () => {
    if (!selectedBooking) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("driverToken");

      const response = await axiosClient.put(
        `/api/driver/bookings/${selectedBooking._id}/status`,
        { status: "Delivered" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking._id === selectedBooking._id
              ? { ...booking, status: "Delivered" }
              : booking
          )
        );

        setSelectedBooking(prev => ({
          ...prev,
          status: "Delivered"
        }));

        console.log("✅ Package marked as delivered");
      }
    } catch (err) {
      console.error("❌ Error marking as delivered:", err);
      setError("Failed to mark as delivered. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setUpdating(false);
    }
  };

  // Mark single destination as delivered
const markSingleDestinationDelivered = async (destinationIndex) => {
  if (!selectedBooking || !capturedImage) {
    alert('Please take a photo of the delivery first');
    return;
  }

  setUpdating(true);
  try {
    const token = localStorage.getItem("driverToken");

    const response = await axiosClient.put(
      `/api/driver/bookings/${selectedBooking._id}/deliver-destination`,
      { 
        destinationIndex: destinationIndex,
        proofOfDelivery: capturedImage,
        notes: destinationNotes
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      // Update local state
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === selectedBooking._id
            ? { 
                ...booking, 
                status: response.data.booking.status,
                destinationDeliveries: response.data.booking.destinationDeliveries 
              }
            : booking
        )
      );

      setSelectedBooking(prev => ({
        ...prev,
        status: response.data.booking.status,
        destinationDeliveries: response.data.booking.destinationDeliveries
      }));

      // Reset form
      setCapturedImage(null);
      setDestinationNotes('');
      setSelectedDestinationIndex(null);

      alert(response.data.msg);
    }
  } catch (err) {
    console.error("❌ Error marking destination as delivered:", err);
    alert(err.response?.data?.msg || "Failed to mark destination as delivered");
  } finally {
    setUpdating(false);
  }
};

const markAsCompleted = async () => {
  if (!selectedBooking || !capturedImage) return;

  setUpdating(true);
  try {
    const token = localStorage.getItem("driverToken");

    const response = await axiosClient.put(
      `/api/driver/bookings/${selectedBooking._id}/status`,
      { 
        status: "Completed",
        proofOfDelivery: capturedImage
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === selectedBooking._id
            ? { ...booking, status: "Completed" }
            : booking
        )
      );

      setSelectedBooking(prev => ({
        ...prev,
        status: "Completed"
      }));

      console.log("✅ Trip marked as completed");
      
      // Stop location tracking when trip completes
      stopLocationTracking();

      setTimeout(() => {
        closeModal();
      }, 1500);
    }
  } catch (err) {
    console.error("❌ Error marking as completed:", err);
    setError("Failed to mark as completed. Please try again.");
    setTimeout(() => setError(""), 5000);
  } finally {
    setUpdating(false);
  }
};

// Cleanup on component unmount
useEffect(() => {
  return () => {
    stopLocationTracking();
  };
}, []);

// Get next pending destination
const getNextPendingDestination = (booking) => {
  if (!booking.destinationDeliveries || booking.destinationDeliveries.length === 0) {
    return null;
  }
  return booking.destinationDeliveries.find(d => d.status === 'pending');
};

// Check if all destinations are delivered
const allDestinationsDelivered = (booking) => {
  if (!booking.destinationDeliveries || booking.destinationDeliveries.length === 0) {
    return false;
  }
  return booking.destinationDeliveries.every(d => d.status === 'delivered');
};

// Get delivery statistics
const getDeliveryStats = (booking) => {
  if (!booking.destinationDeliveries || booking.destinationDeliveries.length === 0) {
    return { total: 0, delivered: 0, pending: 0 };
  }
  
  const delivered = booking.destinationDeliveries.filter(d => d.status === 'delivered').length;
  const total = booking.destinationDeliveries.length;
  const pending = total - delivered;
  
  return { total, delivered, pending };
};

const fetchBookings = async () => {
  try {
    const token = localStorage.getItem("driverToken");

    if (!token) {
      setError("No driver token found. Please log in again.");
      setLoading(false);
      return;
    }

    const res = await axiosClient.get("/api/driver/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.data.success) {
      // ✨ NEW: Filter out completed bookings - only show active ones
      const activeBookings = res.data.bookings.filter(
        booking => booking.status !== "Completed"
      );
      setBookings(activeBookings);
      setDebugInfo(res.data.debug);
      setError("");
    } else {
      setError("Failed to fetch bookings");
    }
  } catch (err) {
    console.error("❌ Frontend DEBUG: Error fetching bookings:", err);

    if (err.response?.status === 401) {
      setError("Session expired. Please log in again.");
      localStorage.removeItem("driverToken");
    } else {
      setError(err.response?.data?.msg || "Failed to load bookings.");
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const refreshBookings = async () => {
    setRefreshing(true);
    await fetchBookings();
  };

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
    setCapturedImage(null);
    setExpandedSections({
      route: true,
      cargo: false,
      customer: false,
      team: false
    });
  };


  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setCapturedImage(null);
    stopCamera();
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };

  useEffect(() => {
    if (showModal && selectedBooking && mapRef.current) {
      setTimeout(() => initializeMap(), 100);
    }
  }, [showModal, selectedBooking]);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
  // Check location permission on mount
  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      console.warn("⚠️ Geolocation not supported");
      return;
    }

    try {
      // Try to get permission early
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log("📍 Location permission status:", permission.state);
      
      if (permission.state === 'denied') {
        alert('Location access is blocked. Please enable it in your browser settings to track trips.');
      }
    } catch (err) {
      console.log("Could not check location permission:", err);
    }
  };

  checkLocationPermission();
}, []);

useEffect(() => {
  return () => {
    console.log("🧹 Cleaning up location tracking");
    stopLocationTracking();
  };
}, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${driverloginbg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-purple-400/50 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-purple-400/50 rounded w-3/4"></div>
              <div className="h-4 bg-purple-400/50 rounded w-1/2"></div>
            </div>
          </div>
          <p className="text-center mt-4 text-purple-200">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${driverloginbg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Bookings</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchBookings}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4"
        style={{
          backgroundImage: `url(${driverloginbg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay + decorative glows (match DriverDashboard style) */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-purple-800/50 to-indigo-900/50"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-60 sm:h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-60 sm:h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 sm:w-40 sm:h-40 bg-purple-400/5 rounded-full blur-2xl"></div>

        <div className="max-w-md mx-auto relative z-10">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Bookings</h1>
              {debugInfo && (
                <p className="text-xs text-purple-200">
                  Found {debugInfo.queriedBookings} assignments
                </p>
              )}
            </div>
            <button
              onClick={refreshBookings}
              disabled={refreshing}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition"
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-white rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl text-center">
              <Package className="w-12 h-12 text-purple-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Bookings Found</h2>
              <p className="text-purple-200 mb-2">You don't have any assigned bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const StatusIcon = statusColors[booking.status]?.icon || AlertCircle;
                return (
                  <div
                    key={booking._id}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 cursor-pointer hover:bg-white/15 transition-all active:scale-95"
                    onClick={() => openBookingDetails(booking)}
                  >
                    {/* Booking Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-white">{booking.reservationId}</h3>
                        <p className="text-sm text-purple-200 font-mono">{booking.tripNumber}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[booking.status]?.bg} ${statusColors[booking.status]?.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {booking.status === "In Transit" ? "On Trip" : booking.status || "Pending"}
                      </div>
                    </div>

                    {/* Company & Product */}
                    <div className="mb-3">
                      <p className="font-semibold text-white">{booking.companyName}</p>
                      <p className="text-sm text-purple-200 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {booking.productName} ({booking.quantity} units)
                      </p>
                    </div>

                    {/* Route */}
                    <div className="mb-3 text-sm bg-white/5 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="text-xs text-purple-300">From:</span>
                        <span className="font-medium text-xs text-white">
                          {booking.originAddress.length > 30 ? booking.originAddress.substring(0, 30) + '...' : booking.originAddress}
                        </span>
                      </div>
                      
                      {getDestinations(booking).map((dest, idx) => (
                        <div key={idx} className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span className="text-xs text-purple-300">
                            {getDestinations(booking).length > 1 ? `To (${idx + 1}):` : 'To:'}
                          </span>
                          <span className="font-medium text-xs text-white">
                            {dest.length > 30 ? dest.substring(0, 30) + '...' : dest}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-4 text-sm text-purple-200">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(booking.dateNeeded).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.timeNeeded}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedBooking && (
          <div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div className="absolute inset-0 overflow-y-auto">
              <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-2xl border border-white/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">

                  {/* Modal Header - Sticky */}
                  <div className="sticky top-0 bg-white/80 border-b border-gray-200/50 px-4 py-3 flex items-center justify-between z-10">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{selectedBooking.reservationId}</h3>
                      <p className="text-sm text-gray-600">{selectedBooking.tripNumber}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[selectedBooking.status]?.bg} ${statusColors[selectedBooking.status]?.text}`}>
                      {React.createElement(statusColors[selectedBooking.status]?.icon || AlertCircle, { className: "w-3 h-3" })}
                      {selectedBooking.status === "In Transit" ? "On Trip" : selectedBooking.status || "Pending"}
                    </div>
                    <button
                      onClick={closeModal}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body - Scrollable */}
                  <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

                    {/* Camera Section - Only show when status is Delivered */}
                    {selectedBooking.status === "Delivered" && !showCamera && (
                      <div className="p-4 border-b border-gray-100">
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Camera className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">Proof of Delivery</h4>
                          </div>
                          
                          {capturedImage ? (
                            <div className="space-y-3">
                              <img 
                                src={capturedImage} 
                                alt="Proof of Delivery" 
                                className="w-full rounded-lg border-2 border-green-500"
                              />
                              <button
                                onClick={retakePhoto}
                                className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Blurry? Retake Photo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={startCamera}
                              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                              <Camera className="w-5 h-5" />
                              Take Photo
                            </button>
                          )}
                          <p className="text-xs text-gray-600 text-center mt-2">
                             Please take a proof of delivery to complete this booking
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Camera View */}
                    {showCamera && (
                      <div className="p-4 border-b border-gray-100">
                        <div className="bg-black rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={capturePhoto}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Capture
                          </button>
                          <button
                            onClick={stopCamera}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                  {/* Destination Delivery Progress */}
                      {selectedBooking.destinationDeliveries && selectedBooking.destinationDeliveries.length > 1 && (
                        <div className="p-4 border-b border-gray-100">
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              Delivery Stops ({getDeliveryStats(selectedBooking).delivered} of {getDeliveryStats(selectedBooking).total} delivered)
                            </h4>
                            <div className="space-y-3">
                              {selectedBooking.destinationDeliveries.map((dest, index) => (
                                <div 
                                  key={index}
                                  className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                                    dest.status === 'delivered' 
                                      ? 'bg-green-50 border border-green-200' 
                                      : dest.destinationIndex === getNextPendingDestination(selectedBooking)?.destinationIndex
                                      ? 'bg-yellow-50 border border-yellow-200'
                                      : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    dest.status === 'delivered' 
                                      ? 'bg-green-500 text-white' 
                                      : dest.destinationIndex === getNextPendingDestination(selectedBooking)?.destinationIndex
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-gray-300 text-gray-600'
                                  }`}>
                                    {dest.status === 'delivered' ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{dest.destinationAddress}</p>
                                    {dest.deliveredAt && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ Delivered at {new Date(dest.deliveredAt).toLocaleString()}
                                      </p>
                                    )}
                                    {!dest.deliveredAt && dest.destinationIndex === getNextPendingDestination(selectedBooking)?.destinationIndex && (
                                      <p className="text-xs text-blue-600 mt-1 font-medium">
                                        → Next stop
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Map Section */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          ref={mapRef}
                          className="w-full h-48"
                        >
                          <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">Loading route...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Sections */}

                    {/* Route Section */}
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => toggleSection('route')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Route Details</span>
                        </div>
                        {expandedSections.route ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.route && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Origin</p>
                              <p className="text-sm text-gray-600">{selectedBooking.originAddress}</p>
                            </div>
                          </div>
                          
                          {getDestinations(selectedBooking).map((destination, idx) => (
                            <React.Fragment key={idx}>
                              <div className="border-l-2 border-gray-200 ml-1.5 h-4"></div>
                              <div className="flex items-start gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {getDestinations(selectedBooking).length > 1 ? `Destination ${idx + 1}` : 'Destination'}
                                  </p>
                                  <p className="text-sm text-gray-600">{destination}</p>
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-4 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(selectedBooking.dateNeeded).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {selectedBooking.timeNeeded}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cargo Section */}
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => toggleSection('cargo')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">Cargo Details</span>
                        </div>
                        {expandedSections.cargo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.cargo && (
                        <div className="px-4 pb-4">
                          {/* Check if using new destinationDeliveries model */}
                          {Array.isArray(selectedBooking.destinationDeliveries) && selectedBooking.destinationDeliveries.length > 0 ? (
                            <div className="space-y-3">
                              {selectedBooking.destinationDeliveries.map((dest, idx) => (
                                <div key={idx} className="p-3 rounded border bg-gray-50">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium text-gray-800">
                                      {`Stop ${dest.destinationIndex + 1 || idx + 1} — ${dest.customerEstablishmentName || 'N/A'}`}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-2">{dest.destinationAddress}</div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white p-2 rounded">
                                      <p className="text-gray-600 text-xs">Product</p>
                                      <p className="font-medium">{dest.productName || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                      <p className="text-gray-600 text-xs">Quantity</p>
                                      <p className="font-medium">{dest.quantity?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                      <p className="text-gray-600 text-xs">Weight</p>
                                      <p className="font-medium flex items-center gap-1">
                                        <Weight className="w-3 h-3" />
                                        {dest.grossWeight || 'N/A'} kg
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Total Summary */}
                              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">Total Stops</span>
                                  <span className="text-lg font-bold text-purple-600">{selectedBooking.destinationDeliveries.length}</span>
                                </div>
                                {selectedBooking.deliveryFee && (
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-200">
                                    <span className="text-sm font-semibold text-gray-700">Delivery Fee</span>
                                    <span className="text-lg font-bold text-green-600">₱{selectedBooking.deliveryFee.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Fallback for old booking format
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="text-gray-600 text-xs">Product</p>
                                <p className="font-medium">{selectedBooking.productName}</p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="text-gray-600 text-xs">Quantity</p>
                                <p className="font-medium">{selectedBooking.quantity?.toLocaleString()} pcs</p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="text-gray-600 text-xs">Weight</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Weight className="w-3 h-3" />
                                  {selectedBooking.grossWeight} kg
                                </p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="text-gray-600 text-xs">Delivery Fee</p>
                                <p className="font-medium text-green-600">₱{selectedBooking.deliveryFee?.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Customer Section */}
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => toggleSection('customer')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Customer Info</span>
                        </div>
                        {expandedSections.customer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.customer && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600 text-xs mb-1">Company</p>
                            <p className="font-medium">{selectedBooking.companyName}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600 text-xs mb-1">Company Address</p>
                            <p className="font-medium">{selectedBooking.originAddress}</p>
                          </div>
                          {selectedBooking.destinationDeliveries && selectedBooking.destinationDeliveries.length > 0 && (
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-gray-600 text-xs mb-2">Delivery Branches</p>
                              <div className="space-y-2">
                                {selectedBooking.destinationDeliveries.map((dest, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-2">
                                      Stop {idx + 1}
                                    </span>
                                    <span className="font-medium">{dest.customerEstablishmentName || 'N/A'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedBooking.deliveryFee && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded border border-green-200">
                              <p className="text-gray-600 text-xs mb-1">Total Delivery Fee</p>
                              <p className="text-2xl font-bold text-green-600">₱{selectedBooking.deliveryFee.toLocaleString()}</p>
                              {selectedBooking.totalDistance && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Total Distance: {selectedBooking.totalDistance.toFixed(2)} km
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Team Section */}
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => toggleSection('team')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span className="font-medium">Team Assignment</span>
                        </div>
                        {expandedSections.team ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.team && (
                        <div className="px-4 pb-4">
                          <div className="space-y-2">
                            {selectedBooking.employeeDetails && selectedBooking.employeeDetails.length > 0 ? (
                              selectedBooking.employeeDetails.map((emp, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium flex-1">{emp.fullName}</span>
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {emp.role}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">No team assigned yet</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Modal Footer - Sticky */}
                  <div className="sticky bottom-0 bg-white/80 border-t border-gray-200/50 p-4 z-10">
                    {selectedBooking.status === "Ready to go" && (
                      <button
                        onClick={startTrip}
                        disabled={updating}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                      >
                        <Play className="w-4 h-4" />
                        {updating ? "Starting Trip..." : "Start Trip"}
                      </button>
                    )}

                    {(selectedBooking.status === "In Transit" || selectedBooking.status === "On Trip") && (
                      <>
                        {/* Check if origin has been picked up */}
                        {!selectedBooking.originPickedUp ? (
                          /* Origin Pickup Flow */
                          <div className="space-y-3">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                              <p className="text-xs font-medium text-blue-700 mb-1">📦 Next Step</p>
                              <p className="text-sm font-bold text-gray-900">Pick up cargo from origin</p>
                              <p className="text-xs text-gray-600 mt-1">{selectedBooking.originAddress}</p>
                            </div>

                            {!capturedImage ? (
                              <button
                                onClick={() => startCamera()}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
                              >
                                <Camera className="w-4 h-4" />
                                Take Pickup Photo
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (!capturedImage) return;
                                  
                                  setUpdating(true);
                                  try {
                                    const token = localStorage.getItem("driverToken");
                                    const response = await axiosClient.put(
                                      `/api/driver/bookings/${selectedBooking._id}/pickup-origin`,
                                      { 
                                        originPickupProof: capturedImage
                                      },
                                      {
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      }
                                    );

                                    if (response.data.success) {
                                      setSelectedBooking(prev => ({
                                        ...prev,
                                        originPickedUp: true,
                                        originPickupAt: new Date(),
                                        originPickupProof: capturedImage
                                      }));

                                      setBookings(prevBookings =>
                                        prevBookings.map(booking =>
                                          booking._id === selectedBooking._id
                                            ? { ...booking, originPickedUp: true }
                                            : booking
                                        )
                                      );

                                      setCapturedImage(null);
                                      alert("✅ Origin pickup confirmed! Now proceed to deliver to destinations.");
                                    }
                                  } catch (err) {
                                    console.error("❌ Error confirming pickup:", err);
                                    alert("Failed to confirm pickup. Please try again.");
                                  } finally {
                                    setUpdating(false);
                                  }
                                }}
                                disabled={updating}
                                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                              >
                                <Check className="w-4 h-4" />
                                {updating ? "Confirming..." : "Confirm Pickup"}
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Destination Delivery Flow - Original Code */
                          <>
                            {selectedBooking.destinationDeliveries && selectedBooking.destinationDeliveries.length > 0 ? (
                              <>
                                {(() => {
                                  const nextDest = getNextPendingDestination(selectedBooking);
                                  const stats = getDeliveryStats(selectedBooking);
                                  
                                  if (!nextDest) {
                                    return (
                                      <button
                                        onClick={markAsCompleted}
                                        disabled={updating || !capturedImage}
                                        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                                      >
                                        {capturedImage ? (
                                          <>
                                            <Check className="w-4 h-4" />
                                            {updating ? "Completing Trip..." : "Complete Entire Trip"}
                                          </>
                                        ) : (
                                          <>
                                            <Camera className="w-4 h-4" />
                                            Take Final Proof of Delivery to Complete
                                          </>
                                        )}
                                      </button>
                                    );
                                  }
                                  
                                  return (
                                    <div className="space-y-3">
                                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                                        <p className="text-xs font-medium text-green-700 mb-1">Next Stop ({nextDest.destinationIndex + 1} of {stats.total})</p>
                                        <p className="text-sm font-bold text-gray-900">{nextDest.destinationAddress}</p>
                                      </div>

                                      {!capturedImage ? (
                                        <button
                                          onClick={() => {
                                            setSelectedDestinationIndex(nextDest.destinationIndex);
                                            startCamera();
                                          }}
                                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          Mark This Stop as Delivered
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => markSingleDestinationDelivered(nextDest.destinationIndex)}
                                          disabled={updating}
                                          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                                        >
                                          <Check className="w-4 h-4" />
                                          {updating ? "Confirming..." : "Confirm Delivery"}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </>
                            ) : (
                              <button
                                onClick={markAsDelivered}
                                disabled={updating}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {updating ? "Marking as Delivered..." : "Mark as Delivered"}
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {selectedBooking.status === "Delivered" && (
                      <button
                        onClick={markAsCompleted}
                        disabled={updating || !capturedImage}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                      >
                        {capturedImage ? (
                          <>
                            <Check className="w-4 h-4" />
                            {updating ? "Completing Trip..." : "Complete Trip"}
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            Take Photo First
                          </>
                        )}
                      </button>
                    )}

                    {selectedBooking.status === "Pending" && (
                      <div className="w-full py-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm text-center font-medium">
                        ⏳ Waiting for Admin approval
                      </div>
                    )}

                    {selectedBooking.status === "Completed" && (
                      <div className="w-full py-3 bg-green-100 text-green-800 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2">
                        <Award className="w-4 h-4" />
                        ✅ Trip completed successfully!
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

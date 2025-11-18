import { useState, useEffect, useRef } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Truck,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  Package,
  Building,
  Calendar,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "../api/axiosClient";
import { motion, AnimatePresence } from "framer-motion";
import truck1000 from "../assets/truck-1000.png";
import truck2000 from "../assets/truck-2000.png";
import truck3000 from "../assets/truck-3000.png";
import truck7000 from "../assets/truck-7000.png";

// Vehicle categories
const VEHICLE_CATEGORIES = [
  {
    id: 1,
    name: "1,000 KG Max Capacity",
    maxWeightCapacity: 1000,
    vehicleType: "4-Wheeler",
    image: truck1000,
  },
  {
    id: 2,
    name: "2,000 KG Max Capacity",
    maxWeightCapacity: 2000,
    vehicleType: "4-Wheeler",
    image: truck2000,
  },
  {
    id: 3,
    name: "3,000 KG Max Capacity",
    maxWeightCapacity: 3000,
    vehicleType: "6-Wheeler",
    image: truck3000,
  },
  {
    id: 4,
    name: "7,000 KG Max Capacity",
    maxWeightCapacity: 7000,
    vehicleType: "6-Wheeler",
    image: truck7000,
  },
];

function Booking() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [routeDistance, setRouteDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const navigate = useNavigate();

  // Data for dropdowns
  const [clients, setClients] = useState([]);
  const [clientBranches, setClientBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  // Vehicle selection states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search states
  const [searchReservationId, setSearchReservationId] = useState("");
  const [searchCompanyName, setSearchCompanyName] = useState("");
  const [searchProductName, setSearchProductName] = useState("");
  const [searchVehicleType, setSearchVehicleType] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  // Sorting state
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("asc");

  // Unique filter lists
  const [uniqueReservationIds, setUniqueReservationIds] = useState([]);
  const [uniqueCompanyNames, setUniqueCompanyNames] = useState([]);
  const [uniqueProductNames, setUniqueProductNames] = useState([]);
  const [uniqueVehicleTypes, setUniqueVehicleTypes] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);

  // Date availability check states
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [dateAvailabilityMessage, setDateAvailabilityMessage] = useState("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Trip type state
  const [selectedBranches, setSelectedBranches] = useState([
    {
      branch: "",
      address: "",
      productName: "",
      quantity: "",
      grossWeight: "",
      key: Date.now(),
    },
  ]);

  const [formData, setFormData] = useState({
    productName: "",
    quantity: "",
    grossWeight: "",
    companyName: "",
    customerEstablishmentName: "",
    originAddress: "",
    destinationAddress: "",
    vehicleId: "",
    vehicleType: "",
    plateNumber: "",
    dateNeeded: "",
    timeNeeded: "",
    employeeAssigned: [""],
    roleOfEmployee: [""],
  });

  const [errors, setErrors] = useState({});

  // Step indicators
  const steps = [
    { number: 1, title: "Vehicle", icon: Truck },
    { number: 2, title: "Details", icon: MapPin },
    { number: 3, title: "Schedule", icon: Users },
    { number: 4, title: "Summary", icon: FileText },
  ];

  // Filter vehicles by category from database
  const getVehiclesByCategory = (category) => {
    return vehicles.filter(
      (vehicle) =>
        vehicle.maxWeightCapacity === category.maxWeightCapacity &&
        vehicle.vehicleType === category.vehicleType &&
        !vehicle.isArchived
      // REMOVED: && vehicle.status === "Available"
    );
  };

  const handleVehicleCategoryClick = (category) => {
    setSelectedCategory(category);
    const vehiclesInCategory = getVehiclesByCategory(category);
    setAvailableVehicles(vehiclesInCategory);

    // Auto-select the first vehicle if available
    if (vehiclesInCategory.length > 0 && !selectedVehicle) {
      handleVehicleSelect(vehiclesInCategory[0]);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData((prev) => ({
      ...prev,
      vehicleId: vehicle.vehicleId,
      vehicleType: vehicle.vehicleType,
      plateNumber: vehicle.plateNumber,
    }));

    // Fetch unavailable dates when vehicle is selected
    fetchUnavailableDates(vehicle.vehicleId, formData.employeeAssigned);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const getSortValue = (booking, key) => {
    switch (key) {
      case "reservation":
        return (booking.reservationId || "").toString().toLowerCase();
      case "trip":
        return (booking.tripNumber || "").toString().toLowerCase();
      case "company":
        return (booking.companyName || "").toString().toLowerCase();
      case "product":
        return Array.isArray(booking.destinationDeliveries) &&
          booking.destinationDeliveries.length > 0
          ? booking.destinationDeliveries
              .map((d) => d.productName || "")
              .join(", ")
              .toLowerCase()
          : (booking.productName || "").toString().toLowerCase();
      case "vehicle":
        return (booking.vehicleType || "").toString().toLowerCase();
      case "date":
        return booking.dateNeeded ? new Date(booking.dateNeeded).getTime() : 0;
      case "status":
        return (booking.status || "").toString().toLowerCase();
      case "employee":
        return Array.isArray(booking.employeeAssigned)
          ? booking.employeeAssigned.join(" ").toLowerCase()
          : (booking.employeeAssigned || "").toString().toLowerCase();
      default:
        return "";
    }
  };

  const getUniqueClientNames = () => {
    const uniqueNames = [
      ...new Set(clients.map((client) => client.clientName)),
    ];
    return uniqueNames;
  };

  const getClientBranches = () => {
    return clientBranches || [];
  };

  const getAvailableBranches = () => {
    if (!formData.companyName || !selectedClient) {
      console.log("⚠️ No company selected or client not found");
      return [];
    }

    const selectedBranchNames = selectedBranches
      .map((b) => b.branch)
      .filter(Boolean);

    const available = (clientBranches || []).filter((b) => {
      const notSelected = !selectedBranchNames.includes(b.branchName);
      const belongsToClient =
        b.client === selectedClient._id || b.client?._id === selectedClient._id;

      return notSelected && belongsToClient;
    });

    console.log("📍 Available branches for selection:", available.length);

    return available;
  };

  const hasAvailableBranches = () => {
    return getAvailableBranches().length > 0;
  };

  const addBranch = () => {
    if (hasAvailableBranches()) {
      setSelectedBranches((prev) => [
        ...prev,
        {
          branch: "",
          address: "",
          latitude: null,
          longitude: null,
          productName: "",
          quantity: "",
          grossWeight: "",
          key: Date.now() + prev.length,
        },
      ]);
    }
  };

  const removeBranch = (index) => {
    if (selectedBranches.length > 1) {
      setSelectedBranches((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleMultipleBranchChange = (index, branchName) => {
    const branch = clientBranches.find((b) => b.branchName === branchName);

    let fullAddress = "";
    let latitude = null;
    let longitude = null;

    if (branch) {
      fullAddress = [
        branch.address?.houseNumber,
        branch.address?.street,
        branch.address?.barangay,
        branch.address?.city,
        branch.address?.province,
        branch.address?.region,
      ]
        .filter(Boolean)
        .join(", ");

      // Store coordinates from branch
      latitude = branch.address?.latitude;
      longitude = branch.address?.longitude;

      console.log(`📍 Branch "${branchName}" coordinates:`, {
        latitude,
        longitude,
      });
    }

    setSelectedBranches((prev) =>
      prev.map((branchData, i) =>
        i === index
          ? {
              ...branchData,
              branch: branchName,
              address: fullAddress,
              latitude: latitude, // Add this
              longitude: longitude, // Add this
            }
          : branchData
      )
    );
  };

  const handleBranchProductChange = (index, field, value) => {
    setSelectedBranches((prev) =>
      prev.map((branchData, i) => {
        if (i !== index) return branchData;
        return { ...branchData, [field]: value };
      })
    );
  };

  const getTotalGrossWeight = () => {
    return selectedBranches.reduce((total, branch) => {
      return total + (parseFloat(branch.grossWeight) || 0);
    }, 0);
  };

  const validateGrossWeight = (branchIndex, weight) => {
    if (!selectedVehicle) return null;

    const weightValue = parseFloat(weight) || 0;
    const totalWeight = selectedBranches.reduce((total, branch, idx) => {
      if (idx === branchIndex) {
        return total + weightValue;
      }
      return total + (parseFloat(branch.grossWeight) || 0);
    }, 0);

    const vehicleCapacity = selectedVehicle.maxWeightCapacity || 0;

    if (totalWeight > vehicleCapacity) {
      return `Total weight (${totalWeight.toFixed(
        2
      )} kg) exceeds vehicle capacity (${vehicleCapacity.toLocaleString()} kg)`;
    }

    return null;
  };

  // Geocode address to get coordinates with multiple fallback attempts
  const geocodeAddressForRoute = async (address) => {
    try {
      console.log(`🔍 Attempting to geocode: "${address}"`);

      // FALLBACK 1: Try to get coordinates from Branch database via API
      try {
        console.log("  📚 Checking branch database...");
        const response = await axiosClient.get(
          `/api/branches/by-address?address=${encodeURIComponent(address)}`
        );
        if (
          response.data &&
          response.data.address?.latitude &&
          response.data.address?.longitude
        ) {
          console.log(`  ✅ Found in branch database:`, [
            response.data.address.latitude,
            response.data.address.longitude,
          ]);
          return [
            response.data.address.latitude,
            response.data.address.longitude,
          ];
        }
      } catch (err) {
        console.log("  ⚠️ No branch found in database, trying geocoding...");
      }

      // FALLBACK 2: Try Client database
      try {
        console.log("  📚 Checking client database...");
        const clientResponse = await axiosClient.get(`/api/clients`);
        const matchingClient = clientResponse.data.find(
          (client) =>
            client.address?.fullAddress?.includes(address) ||
            address.includes(client.clientName)
        );

        if (
          matchingClient &&
          matchingClient.address?.latitude &&
          matchingClient.address?.longitude
        ) {
          console.log(`  ✅ Found in client database:`, [
            matchingClient.address.latitude,
            matchingClient.address.longitude,
          ]);
          return [
            matchingClient.address.latitude,
            matchingClient.address.longitude,
          ];
        }
      } catch (err) {
        console.log("  ⚠️ No client found in database");
      }

      // FALLBACK 3: Geocoding with multiple query attempts
      console.log("  🌐 Trying external geocoding...");
      const attempts = [
        `${address}, Philippines`, // Full address
        address.split(",").slice(-3).join(",") + ", Philippines", // Last 3 parts
        address.split(",").slice(-2).join(",") + ", Philippines", // Last 2 parts (city, province)
        address.match(
          /City of [^,]+|Taguig|Makati|Manila|Quezon City|Pasig|Mandaluyong|Pasay|Parañaque|Las Piñas|Muntinlupa|Caloocan|Malabon|Navotas|Valenzuela|San Juan|Marikina|Pateros/i
        )?.[0] + ", Metro Manila, Philippines", // Just the city
      ].filter(Boolean);

      for (let i = 0; i < attempts.length; i++) {
        const query = attempts[i];
        console.log(
          `  📍 Geocoding attempt ${i + 1}/${attempts.length}: "${query}"`
        );

        await new Promise((resolve) => setTimeout(resolve, 1200)); // Rate limiting

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&countrycodes=ph&limit=1`,
            {
              headers: {
                "User-Agent": "BestAccord-Booking-App",
              },
            }
          );
          const data = await response.json();

          if (data && data.length > 0) {
            const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            console.log(`  ✅ Geocoding success on attempt ${i + 1}:`, coords);
            return coords;
          }
          console.log(`  ⚠️ Attempt ${i + 1} returned no results`);
        } catch (fetchError) {
          console.log(`  ❌ Attempt ${i + 1} failed:`, fetchError.message);
        }
      }

      console.warn(`❌ All geocoding attempts exhausted for: "${address}"`);
      return null;
    } catch (error) {
      console.error("❌ Geocoding error:", error);
      return null;
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axiosClient.get("/api/bookings");
      const activeBookings = res.data.filter((booking) => !booking.isArchived);
      setBookings(activeBookings);
      setFilteredBookings(activeBookings);

      setUniqueReservationIds([
        ...new Set(activeBookings.map((b) => b.reservationId)),
      ]);
      setUniqueCompanyNames([
        ...new Set(activeBookings.map((b) => b.companyName)),
      ]);
      setUniqueProductNames([
        ...new Set(activeBookings.map((b) => b.productName)),
      ]);
      setUniqueVehicleTypes([
        ...new Set(activeBookings.map((b) => b.vehicleType)),
      ]);
      setUniqueStatuses([
        ...new Set(activeBookings.map((b) => b.status || "Pending")),
      ]);
      setUniqueDates([
        ...new Set(
          activeBookings.map((b) => new Date(b.dateNeeded).toLocaleDateString())
        ),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axiosClient.get("/api/clients");
      const activeClients = res.data.filter((client) => !client.isArchived);
      setClients(activeClients);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchBranchesForClient = async (clientId) => {
    try {
      console.log("🔍 Fetching branches for client ID:", clientId);

      // Fetch branches for the specific client using client ID as query parameter
      const res = await axiosClient.get(`/api/branches`, {
        params: { clientId: clientId },
      });

      console.log("📦 Raw branches response:", res.data);

      // Filter branches:
      // 1. Must not be archived
      // 2. Must belong to the selected client (match client field)
      const activeBranches = Array.isArray(res.data)
        ? res.data.filter((b) => {
            const isNotArchived = !b.isArchived;
            const belongsToClient =
              b.client === clientId || b.client?._id === clientId;

            console.log(`Branch "${b.branchName}":`, {
              isNotArchived,
              belongsToClient,
              branchClientId: b.client,
              searchClientId: clientId,
            });

            return isNotArchived && belongsToClient;
          })
        : [];

      console.log(
        "✅ Filtered branches for this client:",
        activeBranches.length
      );
      console.log(
        "📋 Branch names:",
        activeBranches.map((b) => b.branchName)
      );

      setClientBranches(activeBranches);
    } catch (err) {
      console.error("❌ Error fetching branches for client:", err);
      setClientBranches([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await axiosClient.get("/api/vehicles");
      setVehicles(res.data);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axiosClient.get("/api/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchClients();
    fetchVehicles();
    fetchEmployees();
  }, []);

  useEffect(() => {
    let results = bookings;

    if (searchReservationId) {
      results = results.filter(
        (booking) => booking.reservationId === searchReservationId
      );
    }
    if (searchCompanyName) {
      results = results.filter(
        (booking) => booking.companyName === searchCompanyName
      );
    }
    if (searchProductName) {
      results = results.filter(
        (booking) => booking.productName === searchProductName
      );
    }
    if (searchVehicleType) {
      results = results.filter(
        (booking) => booking.vehicleType === searchVehicleType
      );
    }
    if (searchStatus) {
      results = results.filter(
        (booking) => (booking.status || "Pending") === searchStatus
      );
    }
    if (searchDate) {
      results = results.filter(
        (booking) =>
          new Date(booking.dateNeeded).toLocaleDateString() === searchDate
      );
    }
    if (generalSearch) {
      const q = generalSearch.toLowerCase();
      results = results.filter((booking) => {
        const empStr = Array.isArray(booking.employeeAssigned)
          ? booking.employeeAssigned.join(" ")
          : (booking.employeeAssigned || "").toString();

        return (
          booking.reservationId?.toLowerCase().includes(q) ||
          booking.tripNumber?.toLowerCase().includes(q) ||
          booking.companyName?.toLowerCase().includes(q) ||
          booking.productName?.toLowerCase().includes(q) ||
          booking.vehicleType?.toLowerCase().includes(q) ||
          empStr.toLowerCase().includes(q)
        );
      });
    }

    if (sortBy) {
      results = [...results].sort((a, b) => {
        const va = getSortValue(a, sortBy);
        const vb = getSortValue(b, sortBy);

        if (sortBy === "date") {
          return sortDir === "asc" ? va - vb : vb - va;
        }

        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredBookings(results);
    setCurrentPage(1);
  }, [
    searchReservationId,
    searchCompanyName,
    searchProductName,
    searchVehicleType,
    searchDate,
    generalSearch,
    searchStatus,
    bookings,
    sortBy,
    sortDir,
  ]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const openModal = (booking = null) => {
    setCurrentStep(1);
    setSelectedCategory(null);
    setSelectedVehicle(null);
    setAvailableVehicles([]);

    if (booking) {
      setEditBooking(booking);
      // Pre-populate form data for editing
      setFormData({
        productName: booking.productName,
        quantity: booking.quantity,
        grossWeight: booking.grossWeight,
        companyName: booking.companyName,
        customerEstablishmentName: booking.customerEstablishmentName || "",
        originAddress: booking.originAddress,
        destinationAddress: booking.destinationAddress || "",
        vehicleId: booking.vehicleId || "",
        vehicleType: booking.vehicleType,
        plateNumber: booking.plateNumber,
        dateNeeded: new Date(booking.dateNeeded).toISOString().split("T")[0],
        timeNeeded: booking.timeNeeded,
        employeeAssigned: Array.isArray(booking.employeeAssigned)
          ? booking.employeeAssigned
          : [booking.employeeAssigned],
        roleOfEmployee: Array.isArray(booking.roleOfEmployee)
          ? booking.roleOfEmployee
          : [booking.roleOfEmployee],
      });

      // Pre-select vehicle
      const vehicle = vehicles.find((v) => v.vehicleId === booking.vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        const category = VEHICLE_CATEGORIES.find(
          (c) =>
            c.maxWeightCapacity === vehicle.maxWeightCapacity &&
            c.vehicleType === vehicle.vehicleType
        );
        if (category) {
          setSelectedCategory(category);
        }
      }

      if (
        booking.destinationDeliveries &&
        booking.destinationDeliveries.length > 0
      ) {
        setSelectedBranches(
          booking.destinationDeliveries.map((dest, index) => ({
            branch: dest.customerEstablishmentName || "",
            address: dest.destinationAddress || "",
            latitude: dest.latitude || null,
            longitude: dest.longitude || null,
            productName: dest.productName || "",
            quantity: dest.quantity || "",
            grossWeight: dest.grossWeight || "",
            key: Date.now() + index,
          }))
        );
      }

      const client = clients.find((c) => c.clientName === booking.companyName);
      if (client) {
        setSelectedClient(client);
        fetchBranchesForClient(client._id);
      }
    } else {
      setEditBooking(null);
      setSelectedClient(null);
      setSelectedBranches([
        {
          branch: "",
          address: "",
          productName: "",
          quantity: "",
          grossWeight: "",
          key: Date.now(),
        },
      ]);
      setFormData({
        productName: "",
        quantity: "",
        grossWeight: "",
        companyName: "",
        customerEstablishmentName: "",
        originAddress: "",
        destinationAddress: "",
        vehicleId: "",
        vehicleType: "",
        plateNumber: "",
        dateNeeded: "",
        timeNeeded: "",
        employeeAssigned: [""],
        roleOfEmployee: [""],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1);
    setSelectedClient(null);
    setSelectedCategory(null);
    setSelectedVehicle(null);
    setAvailableVehicles([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Check availability when date is selected
    if (name === "dateNeeded" && value) {
      checkDateAvailability(
        value,
        formData.vehicleId,
        formData.employeeAssigned
      );
    }
  };

  const handleCompanyChange = async (e) => {
    const selectedCompanyName = e.target.value;

    console.log("🏢 Company selected:", selectedCompanyName);

    setFormData((prev) => ({
      ...prev,
      companyName: selectedCompanyName,
    }));

    // Find the full client object
    const client = clients.find((c) => c.clientName === selectedCompanyName);

    if (client) {
      console.log("✅ Client found:", {
        id: client._id,
        name: client.clientName,
        hasCoords: !!(client.address?.latitude && client.address?.longitude),
      });

      const fullAddress =
        client.formattedAddress ||
        [
          client.address?.houseNumber,
          client.address?.street,
          client.address?.barangay,
          client.address?.city,
          client.address?.province,
          client.address?.region,
        ]
          .filter(Boolean)
          .join(", ");

      // IMPORTANT: Store coordinates from client
      setFormData((prev) => ({
        ...prev,
        originAddress: fullAddress || "",
        latitude: client.address?.latitude || null,
        longitude: client.address?.longitude || null,
      }));

      console.log("📍 Origin coordinates set:", {
        lat: client.address?.latitude,
        lng: client.address?.longitude,
      });

      setSelectedClient(client);

      // Use client._id to fetch branches
      await fetchBranchesForClient(client._id);
    } else {
      console.warn("⚠️ No client found for company name:", selectedCompanyName);
      setFormData((prev) => ({
        ...prev,
        originAddress: "",
        latitude: null,
        longitude: null,
      }));
      setSelectedClient(null);
      setClientBranches([]);
    }
  };

  const handleEmployeeChange = (index, employeeId) => {
    const newEmployeeAssigned = [...formData.employeeAssigned];
    const newRoleOfEmployee = [...formData.roleOfEmployee];

    newEmployeeAssigned[index] = employeeId;
    const selectedEmployee = employees.find(
      (emp) => emp.employeeId === employeeId
    );
    if (selectedEmployee) {
      newRoleOfEmployee[index] = selectedEmployee.role;
    } else {
      newRoleOfEmployee[index] = "";
    }

    setFormData({
      ...formData,
      employeeAssigned: newEmployeeAssigned,
      roleOfEmployee: newRoleOfEmployee,
    });

    // Refresh unavailable dates when employees change
    if (selectedVehicle) {
      fetchUnavailableDates(selectedVehicle.vehicleId, newEmployeeAssigned);
    }
  };

  const addEmployee = () => {
    setFormData({
      ...formData,
      employeeAssigned: [...formData.employeeAssigned, ""],
      roleOfEmployee: [...formData.roleOfEmployee, ""],
    });
  };

  const removeEmployee = (index) => {
    const newEmployeeAssigned = formData.employeeAssigned.filter(
      (_, i) => i !== index
    );
    const newRoleOfEmployee = formData.roleOfEmployee.filter(
      (_, i) => i !== index
    );

    setFormData({
      ...formData,
      employeeAssigned: newEmployeeAssigned,
      roleOfEmployee: newRoleOfEmployee,
    });
  };

  const getAvailableEmployees = (currentIndex) => {
    const selectedEmployeeIds = formData.employeeAssigned.filter(
      (empId, index) => index !== currentIndex && empId !== ""
    );

    if (currentIndex === 0) {
      return employees.filter(
        (emp) =>
          emp.role === "Driver" &&
          !selectedEmployeeIds.includes(emp.employeeId) &&
          !emp.isArchived
        // REMOVED: && emp.status === "Available"
      );
    } else {
      return employees.filter(
        (emp) =>
          emp.role === "Helper" &&
          !selectedEmployeeIds.includes(emp.employeeId) &&
          !emp.isArchived
        // REMOVED: && emp.status === "Available"
      );
    }
  };

  // Function to check if a date is unavailable
  const isDateUnavailable = (dateString) => {
    return unavailableDates.some((ud) => ud.date === dateString);
  };

  // Function to get unavailability details for a date
  const getDateUnavailabilityDetails = (dateString) => {
    const conflicts = unavailableDates.filter((ud) => ud.date === dateString);
    if (conflicts.length === 0) return null;

    return conflicts.map((c) => c.details).join(" • ");
  };

  // Add this helper function to get minimum selectable date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Add this helper function to get maximum selectable date (90 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    return maxDate.toISOString().split("T")[0];
  };

  const getEmployeeDisplayName = (employeeId) => {
    const employee = employees.find((emp) => emp.employeeId === employeeId);
    if (employee) {
      return `${employee.fullName || employee.name || ""}`.trim();
    }
    return employeeId;
  };

  const getVehicleDisplayName = (vehicleType) => {
    const vehicle = vehicles.find((v) => v.vehicleType === vehicleType);
    if (vehicle) {
      return `${vehicle.color || ""} ${vehicle.manufacturedBy || ""} ${
        vehicle.model || ""
      } - ${vehicle.vehicleType}`
        .replace(/ +/g, " ")
        .trim();
    }
    return vehicleType;
  };

  const formatEmployeeNames = (employeeAssigned) => {
    if (Array.isArray(employeeAssigned)) {
      return employeeAssigned
        .map((empId) => getEmployeeDisplayName(empId))
        .join(", ");
    }
    return getEmployeeDisplayName(employeeAssigned);
  };

  // Calculate total route distance using OSRM
  const calculateTotalRouteDistance = async (
    origin,
    destinations,
    vehicleRate
  ) => {
    setCalculatingRoute(true);
    try {
      let totalDistance = 0;

      // Start from origin
      let currentPoint = origin;

      // Calculate distance from origin to each destination in sequence
      for (let i = 0; i < destinations.length; i++) {
        const destination = destinations[i];

        if (currentPoint && destination) {
          // Use OSRM to get actual road distance
          const url = `https://router.project-osrm.org/route/v1/driving/${currentPoint[1]},${currentPoint[0]};${destination[1]},${destination[0]}?overview=false`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const distanceInKm = data.routes[0].distance / 1000; // Convert meters to km
            totalDistance += distanceInKm;
            console.log(
              `📏 Distance from point ${i} to ${i + 1}: ${distanceInKm.toFixed(
                2
              )} km`
            );
          }

          // Update current point to this destination for next iteration
          currentPoint = destination;
        }
      }

      console.log(`📊 Total route distance: ${totalDistance.toFixed(2)} km`);

      // Calculate delivery fee
      const calculatedFee = totalDistance * vehicleRate;
      console.log(
        `💰 Delivery fee: ₱${calculatedFee.toFixed(2)} (${totalDistance.toFixed(
          2
        )} km × ₱${vehicleRate}/km)`
      );

      setRouteDistance(totalDistance);
      setDeliveryFee(calculatedFee);

      return { distance: totalDistance, fee: calculatedFee };
    } catch (error) {
      console.error("Error calculating route distance:", error);
      return { distance: 0, fee: 0 };
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Check date availability for vehicle and employees
  const checkDateAvailability = async (date, vehicleId, employeeIds) => {
    if (!date || !vehicleId) return;

    setIsCheckingAvailability(true);
    setDateAvailabilityMessage("");

    try {
      const response = await axiosClient.post("/api/bookings/check-conflicts", {
        vehicleId: vehicleId,
        employeeIds: employeeIds.filter((id) => id !== ""),
        bookingDate: date,
        excludeBookingId: editBooking?._id || null,
      });

      const { hasConflicts, conflicts } = response.data;

      if (hasConflicts) {
        const messages = [];

        if (conflicts.vehicle) {
          const vehicle = vehicles.find((v) => v.vehicleId === vehicleId);
          messages.push(
            `🚚 Vehicle ${vehicle?.plateNumber || vehicleId} is already booked`
          );
        }

        if (conflicts.employees && conflicts.employees.length > 0) {
          const employeeNames = conflicts.employees.map((empId) => {
            const emp = employees.find((e) => e.employeeId === empId);
            return emp?.fullName || empId;
          });
          messages.push(
            `👥 ${employeeNames.join(", ")} ${
              employeeNames.length === 1 ? "is" : "are"
            } already booked`
          );
        }

        setDateAvailabilityMessage("⚠️ " + messages.join(" • "));
      } else {
        setDateAvailabilityMessage(
          "✅ All resources are available for this date"
        );
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setDateAvailabilityMessage("❌ Unable to check availability");
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Fetch unavailable dates for vehicle and employees
  const fetchUnavailableDates = async (vehicleId, employeeIds) => {
    if (!vehicleId) return;

    try {
      // Get all bookings for the next 90 days
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);

      const response = await axiosClient.get("/api/bookings");
      const allBookings = response.data.filter(
        (booking) =>
          !booking.isArchived &&
          booking.status !== "Completed" &&
          booking.status !== "Cancelled"
      );

      const unavailableDatesList = [];

      allBookings.forEach((booking) => {
        if (editBooking && booking._id === editBooking._id) return;

        const bookingDate = new Date(booking.dateNeeded)
          .toISOString()
          .split("T")[0];

        // Check if vehicle conflicts
        if (booking.vehicleId === vehicleId) {
          unavailableDatesList.push({
            date: bookingDate,
            reason: "vehicle",
            details: `Vehicle already booked (${booking.reservationId})`,
          });
        }

        // Check if any employees conflict
        if (Array.isArray(booking.employeeAssigned)) {
          const conflictingEmployees = employeeIds.filter(
            (empId) => empId !== "" && booking.employeeAssigned.includes(empId)
          );

          if (conflictingEmployees.length > 0) {
            const empNames = conflictingEmployees.map((empId) => {
              const emp = employees.find((e) => e.employeeId === empId);
              return emp?.fullName || empId;
            });

            unavailableDatesList.push({
              date: bookingDate,
              reason: "employee",
              details: `${empNames.join(", ")} already booked (${
                booking.reservationId
              })`,
            });
          }
        }
      });

      setUnavailableDates(unavailableDatesList);
    } catch (error) {
      console.error("Error fetching unavailable dates:", error);
    }
  };

  const nextStep = async () => {
    // STEP 1 VALIDATION: Check if vehicle is selected
    if (currentStep === 1) {
      if (!selectedVehicle) {
        alert("Please select a vehicle before proceeding");
        return;
      }
    }

    // STEP 2 VALIDATION: Check all destination fields and weight
    if (currentStep === 2) {
      // Check if company is selected
      if (!formData.companyName || formData.companyName.trim() === "") {
        alert("Please select a company");
        return;
      }

      // Check if origin address is populated
      if (!formData.originAddress || formData.originAddress.trim() === "") {
        alert("Please ensure origin address is populated");
        return;
      }

      // Validate each destination
      for (let i = 0; i < selectedBranches.length; i++) {
        const branch = selectedBranches[i];

        // Check branch selection
        if (!branch.branch || branch.branch.trim() === "") {
          alert(`Please select a branch for Stop ${i + 1}`);
          return;
        }

        // Check destination address
        if (!branch.address || branch.address.trim() === "") {
          alert(
            `Please ensure destination address is populated for Stop ${i + 1}`
          );
          return;
        }

        // Check product name
        if (!branch.productName || branch.productName.trim() === "") {
          alert(`Please fill in Product Name for Stop ${i + 1}`);
          return;
        }

        // Check quantity
        if (!branch.quantity || branch.quantity.trim() === "") {
          alert(`Please fill in Quantity for Stop ${i + 1}`);
          return;
        }

        // Check gross weight
        if (!branch.grossWeight || parseFloat(branch.grossWeight) <= 0) {
          alert(`Please fill in valid Gross Weight for Stop ${i + 1}`);
          return;
        }

        // Validate weight capacity
        const weightError = validateGrossWeight(i, branch.grossWeight);
        if (weightError) {
          alert(
            `Stop ${
              i + 1
            }: ${weightError}\n\nPlease check the gross weight or select a different vehicle that can accommodate the total weight.`
          );
          return;
        }
      }
    }

    // STEP 3 VALIDATION: Check schedule and employees
    if (currentStep === 3) {
      // Check date
      if (!formData.dateNeeded || formData.dateNeeded.trim() === "") {
        alert("Please select a date");
        return;
      }

      // Check time
      if (!formData.timeNeeded || formData.timeNeeded.trim() === "") {
        alert("Please select a time");
        return;
      }

      // Check if at least driver is assigned
      if (
        !formData.employeeAssigned[0] ||
        formData.employeeAssigned[0].trim() === ""
      ) {
        alert("Please assign at least a driver");
        return;
      }

      // Calculate route and proceed to Step 4
      if (selectedVehicle) {
        setCalculatingRoute(true);

        let originCoords = null;
        const destCoords = [];

        try {
          console.log("🚀 Starting route calculation...");

          console.log("📍 Getting origin coordinates...");
          if (formData.latitude && formData.longitude) {
            originCoords = [formData.latitude, formData.longitude];
            console.log("  ✅ Using stored origin coordinates:", originCoords);
          } else if (formData.originAddress) {
            console.log(
              "  🔍 Geocoding origin address:",
              formData.originAddress
            );
            originCoords = await geocodeAddressForRoute(formData.originAddress);
            if (originCoords) {
              console.log("  ✅ Origin geocoded to:", originCoords);
            } else {
              console.error("  ❌ Failed to geocode origin");
            }
          }

          console.log("📍 Getting destination coordinates...");
          for (let i = 0; i < selectedBranches.length; i++) {
            const branch = selectedBranches[i];
            console.log(
              `  Processing destination ${i + 1}/${selectedBranches.length}: ${
                branch.branch
              }`
            );

            if (branch.latitude && branch.longitude) {
              console.log(
                `    ✅ Using stored coordinates for "${branch.branch}":`,
                [branch.latitude, branch.longitude]
              );
              destCoords.push([branch.latitude, branch.longitude]);
            } else if (branch.address) {
              console.log(
                `    🔍 No stored coords, geocoding address: "${branch.address}"`
              );
              const coords = await geocodeAddressForRoute(branch.address);
              if (coords) {
                console.log(`    ✅ Geocoded to:`, coords);
                destCoords.push(coords);
              } else {
                console.warn(`    ❌ Failed to geocode: "${branch.address}"`);
              }
            } else {
              console.warn(
                `    ⚠️ No address or coordinates available for destination ${
                  i + 1
                }`
              );
            }
          }

          console.log("📊 Coordinate collection complete:");
          console.log("  Origin:", originCoords);
          console.log(
            "  Destinations:",
            destCoords.length,
            "of",
            selectedBranches.length
          );
          console.log("  Vehicle rate: ₱", selectedVehicle.kmRate);

          if (originCoords && destCoords.length > 0) {
            console.log("✅ Proceeding with route calculation...");
            await calculateTotalRouteDistance(
              originCoords,
              destCoords,
              selectedVehicle.kmRate || 0
            );
          } else {
            console.warn("⚠️ Insufficient coordinates for route calculation");
            console.warn("  - Origin available:", !!originCoords);
            console.warn(
              "  - Destinations found:",
              destCoords.length,
              "/",
              selectedBranches.length
            );

            alert(
              `⚠️ Unable to calculate route distance.\n\nMissing coordinates:\n${
                !originCoords ? "- Origin location\n" : ""
              }${
                destCoords.length === 0
                  ? "- All destination locations"
                  : destCoords.length < selectedBranches.length
                  ? `- ${
                      selectedBranches.length - destCoords.length
                    } destination(s)`
                  : ""
              }\n\nDelivery fee will be set to 0. You can update it manually later.`
            );

            setRouteDistance(0);
            setDeliveryFee(0);
          }
        } catch (error) {
          console.error("❌ Error in route calculation:", error);
          alert(
            "An error occurred while calculating the route. Delivery fee will be set to 0."
          );
          setRouteDistance(0);
          setDeliveryFee(0);
        } finally {
          setCalculatingRoute(false);
        }
      }
    }

    // Move to next step
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (currentStep !== 4) {
      return;
    }

    try {
      for (let i = 0; i < selectedBranches.length; i++) {
        const branch = selectedBranches[i];
        if (!branch.branch || branch.branch.trim() === "") {
          alert(`Please select a branch for Stop ${i + 1}`);
          return;
        }
        if (!branch.address || branch.address.trim() === "") {
          alert(
            `Please ensure destination address is populated for Stop ${i + 1}`
          );
          return;
        }
        if (!branch.productName || branch.productName.trim() === "") {
          alert(`Please fill in Product Name for Stop ${i + 1}`);
          return;
        }
        if (!branch.quantity || parseInt(branch.quantity) <= 0) {
          alert(`Please fill in valid Quantity for Stop ${i + 1}`);
          return;
        }
        if (!branch.grossWeight || parseFloat(branch.grossWeight) <= 0) {
          alert(`Please fill in valid Gross Weight for Stop ${i + 1}`);
          return;
        }

        const weightError = validateGrossWeight(i, branch.grossWeight);
        if (weightError) {
          alert(`Stop ${i + 1}: ${weightError}`);
          return;
        }
      }

      const destinationDeliveries = selectedBranches.map((branch, index) => ({
        customerEstablishmentName: branch.branch,
        destinationAddress: branch.address,
        destinationIndex: index,
        latitude: branch.latitude || null,
        longitude: branch.longitude || null,
        typeOfOrder: "Delivery",
        productName: branch.productName,
        quantity: branch.quantity,
        grossWeight: parseFloat(branch.grossWeight) || 0,
        status: "pending",
      }));

      console.log(
        "📍 Destination deliveries with coordinates:",
        destinationDeliveries
      );

      const originAddressDetails = selectedClient
        ? {
            ...(selectedClient.address || {}),
            formattedAddress:
              formData.originAddress || selectedClient.formattedAddress || "",
          }
        : formData.originAddress
        ? { formattedAddress: formData.originAddress }
        : null;

      const submitData = {
        companyName: formData.companyName,
        originAddress: formData.originAddress,
        numberOfStops: selectedBranches.length,
        destinationDeliveries: destinationDeliveries,
        vehicleId: formData.vehicleId,
        vehicleType: formData.vehicleType,
        plateNumber: formData.plateNumber,
        dateNeeded: new Date(formData.dateNeeded),
        timeNeeded: formData.timeNeeded,
        employeeAssigned: Array.isArray(formData.employeeAssigned)
          ? formData.employeeAssigned.filter((emp) => emp !== "")
          : [formData.employeeAssigned].filter((emp) => emp !== ""),
        roleOfEmployee: Array.isArray(formData.roleOfEmployee)
          ? formData.roleOfEmployee.filter((role) => role !== "")
          : [formData.roleOfEmployee].filter((role) => role !== ""),
        originAddressDetails: originAddressDetails,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        deliveryFee: deliveryFee || 0,
        totalDistance: routeDistance || 0,
      };

      console.log("📤 Submit Data:", JSON.stringify(submitData, null, 2));

      if (editBooking) {
        await axiosClient.put(`/api/bookings/${editBooking._id}`, submitData);
        alert("Booking updated successfully!");
      } else {
        await axiosClient.post("/api/bookings", submitData);
        alert("Booking created successfully!");
      }
      closeModal();
      fetchBookings();
    } catch (err) {
      console.error("Error:", err);
      console.error("Error response:", err.response?.data);

      if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert("Error adding/updating booking. Please try again.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this booking?"))
      return;

    try {
      await axiosClient.patch(`/api/bookings/${id}/archive`, {
        isArchived: true,
      });
      alert("Booking archived successfully");
      fetchBookings();
    } catch (err) {
      console.error("Error archiving booking:", err);
      alert("Error archiving booking. Please try again.");
    }
  };

  const viewBooking = (booking) => {
    navigate(`/dashboard/booking/${booking._id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header with Purple Theme */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl -z-10"></div>
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-2">
              Bookings
            </h1>
            <p className="text-sm text-gray-600">
              Manage and track all your bookings
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform transition-all duration-300 font-medium"
          >
            <Plus size={20} />
            Book a Trip
          </motion.button>
        </div>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <select
            value={searchReservationId}
            onChange={(e) => setSearchReservationId(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[160px]"
          >
            <option value="">All Reservations</option>
            {uniqueReservationIds.map((id, i) => (
              <option key={i} value={id}>
                {id}
              </option>
            ))}
          </select>

          <select
            value={searchCompanyName}
            onChange={(e) => setSearchCompanyName(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[160px]"
          >
            <option value="">All Companies</option>
            {uniqueCompanyNames.map((company, i) => (
              <option key={i} value={company}>
                {company}
              </option>
            ))}
          </select>

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status, i) => (
              <option key={i} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search anything..."
            value={generalSearch}
            onChange={(e) => setGeneralSearch(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[200px]"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  No
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort("reservation")}
                >
                  Reservation ID{" "}
                  {sortBy === "reservation" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort("company")}
                >
                  Company{" "}
                  {sortBy === "company" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort("vehicle")}
                >
                  Vehicle{" "}
                  {sortBy === "vehicle" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  Date {sortBy === "date" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  Status{" "}
                  {sortBy === "status" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {paginatedBookings.map((booking, index) => (
                <motion.tr
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-purple-50/50 transition-colors duration-200"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    <motion.button
                      onClick={() => viewBooking(booking)}
                      className="text-purple-700 font-semibold hover:text-purple-900 underline cursor-pointer bg-transparent border-none p-0"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {booking.reservationId}
                    </motion.button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {booking.companyName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getVehicleDisplayName(booking.vehicleType)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.dateNeeded).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        (booking.status || "Pending") === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : (booking.status || "Pending") === "In Transit"
                          ? "bg-blue-100 text-blue-800"
                          : (booking.status || "Pending") === "Delivered"
                          ? "bg-green-100 text-green-800"
                          : (booking.status || "Pending") === "Completed"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {booking.status || "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => viewBooking(booking)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View booking"
                      >
                        <Eye size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (
                            booking.status === "In Transit" ||
                            booking.status === "Delivered" ||
                            booking.status === "Completed"
                          ) {
                            alert("Cannot edit booking in this status");
                            return;
                          }
                          openModal(booking);
                        }}
                        disabled={
                          booking.status === "In Transit" ||
                          booking.status === "Delivered" ||
                          booking.status === "Completed"
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          booking.status === "In Transit" ||
                          booking.status === "Delivered" ||
                          booking.status === "Completed"
                            ? "text-gray-400 cursor-not-allowed bg-gray-100"
                            : "text-indigo-600 hover:bg-indigo-50"
                        }`}
                      >
                        <Pencil size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(booking._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Archive booking"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-t border-purple-100">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
            }`}
          >
            Previous
          </motion.button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Page{" "}
              <span className="font-bold text-purple-700">{currentPage}</span>{" "}
              of <span className="font-bold text-purple-700">{totalPages}</span>
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
            }`}
          >
            Next
          </motion.button>
        </div>
      </motion.div>

      {/* Enhanced 4-Step Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-indigo-100"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 rounded-t-3xl z-10 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editBooking ? "Edit Booking" : "Create New Booking"}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      Step {currentStep} of 4: {steps[currentStep - 1].title}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = currentStep === step.number;
                        const isCompleted = currentStep > step.number;

                        return (
                          <div
                            key={step.number}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                              isActive
                                ? "bg-white text-purple-600 shadow-lg"
                                : isCompleted
                                ? "bg-green-400 text-white"
                                : "bg-purple-400/30 text-white"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={closeModal}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={24} className="text-white" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <AnimatePresence mode="wait">
                  {/* STEP 1: Vehicle Selection */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Select Your Vehicle Type
                        </h3>
                        <p className="text-gray-600">
                          Choose the vehicle that best fits your shipment needs
                        </p>
                      </div>

                      {/* Vehicle Category Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
                        {VEHICLE_CATEGORIES.map((category) => {
                          const vehicleCount =
                            getVehiclesByCategory(category).length;
                          const isSelected =
                            selectedCategory?.id === category.id;

                          return (
                            <motion.div
                              key={category.id}
                              className={`relative border-2 rounded-xl p-3 cursor-pointer transition-all duration-300 min-h-[200px] ${
                                isSelected
                                  ? "border-purple-600 bg-purple-50 shadow-xl"
                                  : "border-gray-200 hover:border-purple-400 hover:shadow-lg"
                              }`}
                              onClick={() =>
                                handleVehicleCategoryClick(category)
                              }
                              onMouseEnter={() =>
                                setHoveredCategory(category.id)
                              }
                              onMouseLeave={() => setHoveredCategory(null)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {/* Selected Badge */}
                              {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full shadow-lg">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                              )}

                              {/* Available Count Badge */}
                              <div
                                className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  vehicleCount > 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {vehicleCount}{" "}
                                {vehicleCount === 1 ? "unit" : "units"}
                              </div>

                              {/* Truck Image */}
                              <div className="flex items-center justify-center h-20 mb-2">
                                <img
                                  src={category.image}
                                  alt={category.name}
                                  className="h-full w-auto object-contain"
                                  onError={(e) => {
                                    e.target.src =
                                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect fill="%23e5e7eb" width="100" height="60"/><text x="50%" y="50%" fill="%239ca3af" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle">🚚</text></svg>';
                                  }}
                                />
                              </div>

                              {/* Vehicle Info */}
                              <div className="text-center">
                                <h4 className="text-xs font-bold text-gray-900 mb-1">
                                  {category.name}
                                </h4>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                                    {category.maxWeightCapacity.toLocaleString()}{" "}
                                    kg
                                  </span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                                    {category.vehicleType}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Available Vehicles List */}
                      <AnimatePresence>
                        {(hoveredCategory || selectedCategory) && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mt-8 max-w-4xl mx-auto"
                          >
                            {(() => {
                              const category = VEHICLE_CATEGORIES.find(
                                (c) =>
                                  c.id ===
                                  (hoveredCategory || selectedCategory?.id)
                              );
                              const vehicleList =
                                getVehiclesByCategory(category);

                              return (
                                <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg">
                                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-purple-600" />
                                    Available {category.name} Units
                                  </h4>

                                  {vehicleList.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {vehicleList.map((vehicle) => (
                                        <motion.div
                                          key={vehicle._id}
                                          className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            selectedVehicle?.vehicleId ===
                                            vehicle.vehicleId
                                              ? "border-purple-600 bg-purple-50"
                                              : "border-gray-200 hover:border-purple-300 bg-gray-50"
                                          }`}
                                          onClick={() =>
                                            handleVehicleSelect(vehicle)
                                          }
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="font-semibold text-gray-900">
                                                {vehicle.manufacturedBy}{" "}
                                                {vehicle.model}
                                              </p>
                                              <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                  vehicle.status === "Available"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-orange-100 text-orange-800"
                                                }`}
                                              >
                                                {vehicle.status}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                              {vehicle.plateNumber}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {vehicle.color} • ID:{" "}
                                              {vehicle.vehicleId}
                                            </p>
                                          </div>
                                          <div className="text-right ml-4">
                                            <p className="text-xl font-bold text-purple-600">
                                              ₱{vehicle.kmRate || 0}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              per km
                                            </p>
                                            {selectedVehicle?.vehicleId ===
                                              vehicle.vehicleId && (
                                              <CheckCircle className="w-5 h-5 text-purple-600 mt-1 ml-auto" />
                                            )}
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                      <p className="text-sm">
                                        No available vehicles in this category
                                      </p>
                                      <p className="text-xs mt-1">
                                        All units are currently on trip or
                                        unavailable
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!selectedCategory && !hoveredCategory && (
                        <div className="text-center text-gray-500 text-sm mt-6">
                          Click or hover over a vehicle type to see available
                          units and rates
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 2: Customer Details & Route */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Building className="w-5 h-5 text-indigo-600" />
                          Customer Details & Shipment Route
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Company
                            </label>
                            <select
                              name="companyName"
                              value={formData.companyName}
                              onChange={handleCompanyChange}
                              required
                              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">
                                Select from existing records
                              </option>
                              {getUniqueClientNames().map(
                                (clientName, index) => (
                                  <option key={index} value={clientName}>
                                    {clientName}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Origin/From
                            </label>
                            <input
                              type="text"
                              name="originAddress"
                              value={formData.originAddress}
                              readOnly
                              required
                              placeholder="Origin will be auto-populated from selected company"
                              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50"
                            />
                            {formData.originAddress && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Origin populated: {formData.originAddress}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Destinations
                            </label>

                            <div className="space-y-4">
                              {selectedBranches.map((branchData, index) => (
                                <div
                                  key={branchData.key}
                                  className="border-2 border-indigo-300 rounded-2xl p-5 bg-gradient-to-br from-indigo-50 to-purple-50"
                                >
                                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-indigo-200">
                                    <span className="text-base font-bold text-indigo-700 bg-indigo-200 px-4 py-2 rounded-full">
                                      Stop {index + 1}
                                    </span>
                                    {selectedBranches.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeBranch(index)}
                                        className="text-red-600 hover:text-red-800 text-sm font-semibold flex items-center gap-1 px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        ✕ Remove Stop
                                      </button>
                                    )}
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Select Branch
                                    </label>
                                    <select
                                      value={branchData.branch}
                                      onChange={(e) =>
                                        handleMultipleBranchChange(
                                          index,
                                          e.target.value
                                        )
                                      }
                                      required
                                      disabled={!formData.companyName}
                                      className="w-full px-4 py-2.5 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 font-medium"
                                    >
                                      <option value="">Select branch</option>
                                      {formData.companyName &&
                                        getClientBranches().map((b) => (
                                          <option
                                            key={b._id}
                                            value={b.branchName}
                                            disabled={selectedBranches.some(
                                              (sb, i) =>
                                                i !== index &&
                                                sb.branch === b.branchName
                                            )}
                                          >
                                            {b.branchName}
                                            {selectedBranches.some(
                                              (sb, i) =>
                                                i !== index &&
                                                sb.branch === b.branchName
                                            )
                                              ? " (Selected)"
                                              : ""}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                      Destination Address
                                    </label>
                                    <input
                                      type="text"
                                      value={branchData.address}
                                      readOnly
                                      placeholder="Auto-populated when branch is selected"
                                      className="w-full px-4 py-2.5 border-2 border-indigo-200 rounded-xl bg-indigo-50/70 text-gray-700 font-medium"
                                    />
                                  </div>

                                  <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                                    <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                                      <Package className="w-4 h-4" />
                                      Product Details for this Stop
                                    </h4>

                                    <div className="mb-4">
                                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Product Name
                                      </label>
                                      <input
                                        type="text"
                                        value={branchData.productName}
                                        onChange={(e) =>
                                          handleBranchProductChange(
                                            index,
                                            "productName",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Enter product name"
                                        required
                                        className="w-full px-4 py-2.5 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                          Quantity
                                        </label>
                                        <input
                                          type="text"
                                          value={branchData.quantity}
                                          onChange={(e) =>
                                            handleBranchProductChange(
                                              index,
                                              "quantity",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Enter quantity"
                                          required
                                          className="w-full px-4 py-2.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                          Gross Weight (KG)
                                        </label>
                                        <input
                                          type="number"
                                          value={branchData.grossWeight}
                                          onChange={(e) =>
                                            handleBranchProductChange(
                                              index,
                                              "grossWeight",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Enter weight in kg"
                                          required
                                          min="0.1"
                                          step="0.1"
                                          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 font-medium ${
                                            validateGrossWeight(
                                              index,
                                              branchData.grossWeight
                                            )
                                              ? "border-red-300 focus:ring-red-500 bg-red-50"
                                              : "border-purple-300 focus:ring-purple-500"
                                          }`}
                                        />
                                        {validateGrossWeight(
                                          index,
                                          branchData.grossWeight
                                        ) && (
                                          <p className="text-xs text-red-600 mt-1 font-semibold">
                                            ⚠️{" "}
                                            {validateGrossWeight(
                                              index,
                                              branchData.grossWeight
                                            )}
                                          </p>
                                        )}
                                        {selectedVehicle &&
                                          !validateGrossWeight(
                                            index,
                                            branchData.grossWeight
                                          ) &&
                                          branchData.grossWeight && (
                                            <p className="text-xs text-green-600 mt-1 font-semibold">
                                              ✓ Within capacity (
                                              {getTotalGrossWeight().toFixed(2)}{" "}
                                              /{" "}
                                              {selectedVehicle.maxWeightCapacity?.toLocaleString()}{" "}
                                              kg)
                                            </p>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={addBranch}
                                disabled={
                                  !formData.companyName ||
                                  !hasAvailableBranches()
                                }
                                className="w-full px-5 py-4 bg-gradient-to-r from-purple-300 to-purple-800 text-white rounded-xl hover:from-purple-500 hover:to-purple-900 transition-all duration-300 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ➕ Add Another Destination
                              </motion.button>

                              {!hasAvailableBranches() &&
                                selectedBranches.length > 0 && (
                                  <p className="text-sm text-amber-600 text-center font-medium">
                                    ⚠️ All available branches have been selected
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Schedule & Team */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          Scheduling
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Date *
                              {selectedVehicle &&
                                formData.employeeAssigned.some((e) => e) && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (Showing availability for selected
                                    resources)
                                  </span>
                                )}
                            </label>
                            <input
                              type="date"
                              name="dateNeeded"
                              value={formData.dateNeeded}
                              onChange={handleChange}
                              required
                              min={getMinDate()}
                              max={getMaxDate()}
                              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 ${
                                formData.dateNeeded &&
                                isDateUnavailable(formData.dateNeeded)
                                  ? "border-orange-300 focus:ring-orange-400 bg-orange-50"
                                  : "border-purple-200 focus:ring-purple-400"
                              }`}
                            />

                            {/* Availability Status Message */}
                            {isCheckingAvailability && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                <span>Checking availability...</span>
                              </div>
                            )}

                            {!isCheckingAvailability &&
                              dateAvailabilityMessage && (
                                <div
                                  className={`mt-2 p-3 rounded-lg text-sm ${
                                    dateAvailabilityMessage.startsWith("✅")
                                      ? "bg-green-50 text-green-800 border border-green-200"
                                      : dateAvailabilityMessage.startsWith("⚠️")
                                      ? "bg-orange-50 text-orange-800 border border-orange-200"
                                      : "bg-red-50 text-red-800 border border-red-200"
                                  }`}
                                >
                                  {dateAvailabilityMessage}
                                  {dateAvailabilityMessage.startsWith("⚠️") && (
                                    <p className="mt-1 text-xs">
                                      Note: You can still proceed, but the
                                      vehicle/employees will be marked as "On
                                      Trip" on this date.
                                    </p>
                                  )}
                                </div>
                              )}

                            {/* Unavailable Dates Legend */}
                            {unavailableDates.length > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-semibold text-blue-900 mb-2">
                                  📅 Dates with conflicts for selected
                                  resources:
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {Array.from(
                                    new Set(
                                      unavailableDates.map((ud) => ud.date)
                                    )
                                  )
                                    .sort()
                                    .slice(0, 10)
                                    .map((date) => (
                                      <div
                                        key={date}
                                        className="text-xs text-blue-800"
                                      >
                                        <span className="font-semibold">
                                          {new Date(
                                            date + "T00:00:00"
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          })}
                                          :
                                        </span>{" "}
                                        {getDateUnavailabilityDetails(date)}
                                      </div>
                                    ))}
                                  {unavailableDates.length > 10 && (
                                    <p className="text-xs text-blue-600 italic">
                                      ... and {unavailableDates.length - 10}{" "}
                                      more dates
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {!selectedVehicle && (
                              <p className="text-xs text-gray-500 mt-2">
                                ℹ️ Select a vehicle first to see date
                                availability
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Time *
                            </label>
                            <input
                              type="time"
                              name="timeNeeded"
                              value={formData.timeNeeded}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600" />
                          Assign Employees & Roles
                        </h3>

                        {formData.employeeAssigned.map((employeeId, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-indigo-200 rounded-xl bg-white/50"
                          >
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {index === 0
                                  ? "Select Driver *"
                                  : "Select Helper"}
                              </label>
                              <select
                                value={employeeId}
                                onChange={(e) =>
                                  handleEmployeeChange(index, e.target.value)
                                }
                                required
                                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              >
                                <option value="">
                                  {index === 0
                                    ? "Select Driver"
                                    : "Select Helper"}
                                </option>
                                {getAvailableEmployees(index).map(
                                  (employee) => (
                                    <option
                                      key={employee._id}
                                      value={employee.employeeId}
                                    >
                                      {`${
                                        employee.fullName || employee.name || ""
                                      }`.trim()}
                                      {employee.status !== "Available"
                                        ? ` (${employee.status})`
                                        : ""}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Role
                              </label>
                              <input
                                type="text"
                                value={formData.roleOfEmployee[index] || ""}
                                readOnly
                                placeholder="Role"
                                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50"
                              />
                            </div>

                            <div className="flex items-end">
                              {formData.employeeAssigned.length > 1 && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => removeEmployee(index)}
                                  className="px-4 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors font-medium"
                                >
                                  Remove
                                </motion.button>
                              )}
                            </div>
                          </div>
                        ))}

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={addEmployee}
                          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 rounded-xl hover:from-indigo-200 hover:to-violet-200 transition-all duration-300 font-medium"
                        >
                          + Add Helper
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Booking Summary */}
                  {currentStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          Booking Summary
                        </h3>
                        <p className="text-gray-600">
                          Please review your booking details before confirming
                        </p>
                      </div>

                      {/* Vehicle Summary */}
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Truck className="w-6 h-6 text-purple-600" />
                          <h4 className="text-lg font-bold text-gray-900">
                            Vehicle Details
                          </h4>
                        </div>
                        {selectedVehicle ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Vehicle</p>
                              <p className="font-semibold text-gray-900">
                                {selectedVehicle.manufacturedBy}{" "}
                                {selectedVehicle.model}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                Plate Number
                              </p>
                              <p className="font-semibold text-gray-900">
                                {selectedVehicle.plateNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Capacity</p>
                              <p className="font-semibold text-gray-900">
                                {selectedVehicle.maxWeightCapacity?.toLocaleString()}{" "}
                                kg
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Type</p>
                              <p className="font-semibold text-gray-900">
                                {selectedVehicle.vehicleType}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Color</p>
                              <p className="font-semibold text-gray-900">
                                {selectedVehicle.color}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Rate</p>
                              <p className="font-semibold text-purple-600">
                                ₱{selectedVehicle.kmRate || 0}/km
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">
                            No vehicle selected
                          </p>
                        )}
                      </div>

                      {/* Delivery Fee Summary */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Package className="w-6 h-6 text-green-600" />
                          <h4 className="text-lg font-bold text-gray-900">
                            Delivery Fee Calculation
                          </h4>
                        </div>

                        {calculatingRoute ? (
                          <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <p className="text-sm text-gray-600 mt-2">
                              Calculating route distance...
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">
                                  Total Distance
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {routeDistance > 0
                                    ? `${routeDistance.toFixed(2)} km`
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">
                                  Rate per KM
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                  ₱
                                  {selectedVehicle?.kmRate?.toLocaleString() ||
                                    0}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-green-200">
                              <p className="text-sm text-gray-600 mb-1">
                                Total Delivery Fee
                              </p>
                              <p className="text-3xl font-bold text-green-600">
                                ₱
                                {deliveryFee > 0
                                  ? deliveryFee.toFixed(2)
                                  : "0.00"}
                              </p>
                              {routeDistance > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Calculated based on actual road distance
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Customer & Route Summary */}
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-6 h-6 text-indigo-600" />
                          <h4 className="text-lg font-bold text-gray-900">
                            Route & Shipment
                          </h4>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-600">Company</p>
                            <p className="font-semibold text-gray-900">
                              {formData.companyName || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Origin</p>
                            <p className="font-semibold text-gray-900">
                              {formData.originAddress || "Not specified"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Destination(s)
                            </p>
                            <div className="space-y-2 mt-2">
                              {selectedBranches.map((branch, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white p-3 rounded-lg border border-indigo-200"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">
                                        {branch.branch}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        {branch.address}
                                      </p>
                                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-gray-600">
                                            Product:
                                          </span>{" "}
                                          <span className="font-semibold">
                                            {branch.productName}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">
                                            Qty:
                                          </span>{" "}
                                          <span className="font-semibold">
                                            {branch.quantity}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">
                                            Weight:
                                          </span>{" "}
                                          <span className="font-semibold">
                                            {branch.grossWeight} kg
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Total Weight Summary */}
                              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-3 rounded-lg border-2 border-purple-300">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                      Total Gross Weight
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Vehicle capacity:{" "}
                                      {selectedVehicle?.maxWeightCapacity?.toLocaleString() ||
                                        0}{" "}
                                      kg
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`text-2xl font-bold ${
                                        getTotalGrossWeight() >
                                        (selectedVehicle?.maxWeightCapacity ||
                                          0)
                                          ? "text-red-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {getTotalGrossWeight().toFixed(2)} kg
                                    </p>
                                    {getTotalGrossWeight() >
                                      (selectedVehicle?.maxWeightCapacity ||
                                        0) && (
                                      <p className="text-xs text-red-600 font-semibold mt-1">
                                        ⚠️ Exceeds capacity!
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule Summary */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Calendar className="w-6 h-6 text-green-600" />
                          <h4 className="text-lg font-bold text-gray-900">
                            Schedule & Team
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-semibold text-gray-900">
                              {formData.dateNeeded
                                ? new Date(
                                    formData.dateNeeded
                                  ).toLocaleDateString()
                                : "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Time</p>
                            <p className="font-semibold text-gray-900">
                              {formData.timeNeeded || "Not set"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 mb-2">
                              Assigned Team
                            </p>
                            <div className="space-y-2">
                              {formData.employeeAssigned
                                .filter((e) => e)
                                .map((empId, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-white p-2 rounded-lg"
                                  >
                                    <Users className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold text-gray-900">
                                      {getEmployeeDisplayName(empId)}
                                    </span>
                                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                      {formData.roleOfEmployee[idx]}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Confirmation Note */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> By confirming this booking, you
                          agree that all information provided is accurate and
                          complete.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
                  >
                    Cancel
                  </button>

                  <div className="flex gap-3">
                    {currentStep > 1 && (
                      <button
                        onClick={prevStep}
                        className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all duration-300 shadow-md inline-flex items-center gap-2"
                      >
                        <ChevronLeft size={18} />
                        Back
                      </button>
                    )}

                    {currentStep < 4 ? (
                      <button
                        onClick={nextStep}
                        disabled={currentStep === 1 && !selectedVehicle}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        {editBooking ? "Update Booking" : "Confirm Booking"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Booking;

import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, X, MapPin, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "../api/axiosClient";
import axios from 'axios';


import { motion, AnimatePresence } from "framer-motion";
import addressDefaults from "../constants/addressDefaults";

function Booking() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  // Data for dropdowns
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

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

  // Unique filter values
  const [uniqueReservationIds, setUniqueReservationIds] = useState([]);
  const [uniqueCompanyNames, setUniqueCompanyNames] = useState([]);
  const [uniqueProductNames, setUniqueProductNames] = useState([]);
  const [uniqueVehicleTypes, setUniqueVehicleTypes] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);

  // Trip type state
  const [tripType, setTripType] = useState('single'); // 'single' or 'multiple'
  const [selectedBranches, setSelectedBranches] = useState([
    {
      branch: '',
      address: '',
      productName: '',
      numberOfPackages: '',
      unitPerPackage: '',
      quantity: '',
      grossWeight: '',
      key: Date.now()
    }
  ]);

  // Map states
  const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]); // Default to Manila
  const [markerPosition, setMarkerPosition] = useState(null);
  const [addressSearch, setAddressSearch] = useState("");
  const mapRef = useRef(null);
  const markerRef = useRef(null);


  const [formData, setFormData] = useState({
    productName: "",
    quantity: "",
    grossWeight: "",
    unitPerPackage: "",
    numberOfPackages: "",
    deliveryFee: "",
    companyName: "",
    shipperConsignorName: "",
    customerEstablishmentName: "",
    originAddress: "",
    destinationAddress: "",
    vehicleId: "",
    vehicleType: "",
    plateNumber: "",
    dateNeeded: "",
    timeNeeded: "",
    employeeAssigned: [],
    roleOfEmployee: [],
  });

  useEffect(() => {
    if (formData.region === "130000000") {
      setFormData((prev) => ({ ...prev, province: "Metro Manila" }));
    }
  }, [formData.region]);

  const [errors, setErrors] = useState({});
  const containerRef = useRef(null);

  // Helper function to clean city names
  const cleanCityName = (cityName) => {
    if (!cityName) return "";
    return cityName.replace(/^City of /i, "").toLowerCase();
  };

  // Get unique client names (no duplicates)
  const getUniqueClientNames = () => {
    const uniqueNames = [...new Set(clients.map(client => client.clientName))];
    return uniqueNames;
  };

  // Get branches for selected client
  const getClientBranches = (clientName) => {
    return clients.filter(client => client.clientName === clientName);
  };

  //helper functions for multiple branch selections
  // Get available branches that haven't been selected yet
  const getAvailableBranches = () => {
    if (!formData.companyName) return [];

    const allBranches = getClientBranches(formData.companyName);
    const selectedBranchNames = selectedBranches.map(b => b.branch).filter(Boolean);

    return allBranches.filter(client => !selectedBranchNames.includes(client.clientBranch));
  };

  // Check if there are available branches to add
  const hasAvailableBranches = () => {
    return getAvailableBranches().length > 0;
  };

  // Add a new branch destination
  const addBranch = () => {
    if (hasAvailableBranches()) {
      setSelectedBranches(prev => [
        ...prev,
        {
          branch: '',
          address: '',
          productName: '',
          numberOfPackages: '',
          unitPerPackage: '',
          quantity: '',
          grossWeight: '',
          key: Date.now() + prev.length
        }
      ]);
    }
  };

  // Remove a branch destination
  const removeBranch = (index) => {
    if (selectedBranches.length > 1) {
      setSelectedBranches(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle branch selection for multiple destinations
  const handleMultipleBranchChange = (index, branchName) => {
    const client = clients.find(c =>
      c.clientName === formData.companyName &&
      c.clientBranch === branchName
    );

    let fullAddress = '';
    if (client) {
      fullAddress = [
        client.address?.houseNumber,
        client.address?.street,
        client.address?.barangay,
        client.address?.city,
        client.address?.province,
        client.address?.region
      ].filter(Boolean).join(', ');
    }

    setSelectedBranches(prev =>
      prev.map((branchData, i) =>
        i === index ? { ...branchData, branch: branchName, address: fullAddress } : branchData
      )
    );
  };

  const handleBranchProductChange = (index, field, value) => {
    setSelectedBranches(prev =>
      prev.map((branchData, i) => {
        if (i !== index) return branchData;

        const updated = { ...branchData, [field]: value };

        // Auto-calculate quantity if packages or units change
        if (field === 'numberOfPackages' || field === 'unitPerPackage') {
          const packages = field === 'numberOfPackages' ? parseInt(value) || 0 : parseInt(updated.numberOfPackages) || 0;
          const units = field === 'unitPerPackage' ? parseInt(value) || 0 : parseInt(updated.unitPerPackage) || 0;
          updated.quantity = packages * units;
        }

        return updated;
      })
    );
  };

  // Fetch all required data
  const fetchBookings = async () => {
    try {
      const res = await axiosClient.get("/api/bookings");
      const activeBookings = res.data.filter(booking => !booking.isArchived);
      setBookings(activeBookings);
      setFilteredBookings(activeBookings);

      setUniqueReservationIds([...new Set(activeBookings.map((b) => b.reservationId))]);
      setUniqueCompanyNames([...new Set(activeBookings.map((b) => b.companyName))]);
      setUniqueProductNames([...new Set(activeBookings.map((b) => b.productName))]);
      setUniqueVehicleTypes([...new Set(activeBookings.map((b) => b.vehicleType))]);
      setUniqueStatuses([...new Set(activeBookings.map((b) => (b.status || "Pending")))]);
      setUniqueDates([
        ...new Set(
          activeBookings.map((b) =>
            new Date(b.dateNeeded).toLocaleDateString()
          )
        ),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axiosClient.get("/api/clients");
      const activeClients = res.data.filter(client => !client.isArchived);
      setClients(activeClients);
    } catch (err) {
      console.error("Error fetching clients:", err);
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

  // Filter function
  useEffect(() => {
    let results = bookings;

    if (searchReservationId) {
      results = results.filter((booking) => booking.reservationId === searchReservationId);
    }
    if (searchCompanyName) {
      results = results.filter((booking) => booking.companyName === searchCompanyName);
    }
    if (searchProductName) {
      results = results.filter((booking) => booking.productName === searchProductName);
    }
    if (searchVehicleType) {
      results = results.filter((booking) => booking.vehicleType === searchVehicleType);
    }
    if (searchStatus) {
      results = results.filter((booking) => (booking.status || "Pending") === searchStatus);
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
          ? booking.employeeAssigned.join(' ') // join array into string
          : (booking.employeeAssigned || '').toString();

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

    setFilteredBookings(results);
    setCurrentPage(1);
  }, [searchReservationId, searchCompanyName, searchProductName, searchVehicleType, searchDate, generalSearch, searchStatus, bookings]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Modal handlers
  const openModal = (booking = null) => {
    setCurrentStep(1);
    if (booking) {
      setEditBooking(booking);
      setFormData({
        productName: booking.productName,
        quantity: booking.quantity,
        grossWeight: booking.grossWeight,
        unitPerPackage: booking.unitPerPackage,
        numberOfPackages: booking.numberOfPackages,
        deliveryFee: booking.deliveryFee,
        companyName: booking.companyName,
        shipperConsignorName: booking.shipperConsignorName,
        customerEstablishmentName: booking.customerEstablishmentName || "",
        originAddress: booking.originAddress,
        destinationAddress: booking.destinationAddress || "",
        vehicleId: booking.vehicleId || "",
        vehicleType: booking.vehicleType,
        plateNumber: booking.plateNumber,
        dateNeeded: new Date(booking.dateNeeded).toISOString().split('T')[0],
        timeNeeded: booking.timeNeeded,
        employeeAssigned: Array.isArray(booking.employeeAssigned) ? booking.employeeAssigned : [booking.employeeAssigned],
        roleOfEmployee: Array.isArray(booking.roleOfEmployee) ? booking.roleOfEmployee : [booking.roleOfEmployee],
      });
      if (lat && lng) {
        setMapCenter([lat, lng]);
        setMarkerPosition([lat, lng]);
      } else {
        setMapCenter([14.5995, 120.9842]);
        setMarkerPosition(null);
      }

      const hasMultipleDestinations = Array.isArray(booking.destinationAddresses) && booking.destinationAddresses.length > 1;

      setTripType(hasMultipleDestinations ? 'multiple' : 'single');

      if (booking.destinationDeliveries && booking.destinationDeliveries.length > 0) {
        setSelectedBranches(
          booking.destinationDeliveries.map((dest, index) => ({
            branch: dest.customerEstablishmentName || '',
            address: dest.destinationAddress || '',
            productName: dest.productName || '',
            numberOfPackages: dest.numberOfPackages || '',
            unitPerPackage: dest.unitPerPackage || '',
            quantity: dest.quantity || '',
            grossWeight: dest.grossWeight || '',
            key: Date.now() + index
          }))
        );
      } else {
        setSelectedBranches([
          {
            branch: booking.customerEstablishmentName || '',
            address: booking.destinationAddress || '',
            productName: booking.productName || '',
            numberOfPackages: booking.numberOfPackages || '',
            unitPerPackage: booking.unitPerPackage || '',
            quantity: booking.quantity || '',
            grossWeight: booking.grossWeight || '',
            key: Date.now()
          }
        ]);
      }

      const client = clients.find(c => c.clientName === booking.companyName);
      if (client) {
        setSelectedClient(client);
      }
    } else {
      setEditBooking(null);
      setSelectedClient(null);
      setTripType('single');
      setFormData({
        productName: "",
        quantity: "",
        grossWeight: "",
        unitPerPackage: "",
        numberOfPackages: "",
        deliveryFee: "",
        companyName: "",
        shipperConsignorName: "",
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
      setMapCenter([14.5995, 120.9842]);
      setMarkerPosition(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1);
    setSelectedClient(null);
  };

  const validateField = (name, value) => {
    if (!value || value.toString().trim() === '') {
      setErrors(prev => ({
        ...prev,
        [name]: 'This field is required'
      }));
      return false;
    }

    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: value
      };

      if (name === 'numberOfPackages' || name === 'unitPerPackage') {
        const packages = name === 'numberOfPackages' ? parseInt(value) || 0 : parseInt(prev.numberOfPackages) || 0;
        const unitsPerPackage = name === 'unitPerPackage' ? parseInt(value) || 0 : parseInt(prev.unitPerPackage) || 0;
        newFormData.quantity = packages * unitsPerPackage;
      }

      return newFormData;
    });
    validateField(name, value);
  };

  const handleCompanyChange = (e) => {
    const selectedCompanyName = e.target.value;
    setFormData(prev => ({
      ...prev,
      companyName: selectedCompanyName,
      shipperConsignorName: "",
      originAddress: ""
    }));
    setSelectedClient(null);
  };

  const handleBranchChange = (e) => {
    const selectedBranch = e.target.value;
    const client = clients.find(c => c.clientBranch === selectedBranch && c.clientName === formData.companyName);

    if (client) {
      setSelectedClient(client);

      const fullAddress = [
        client.address?.houseNumber,
        client.address?.street,
        client.address?.barangay,
        client.address?.city,
        client.address?.province,
        client.address?.region
      ].filter(Boolean).join(', ');

      setFormData(prev => ({
        ...prev,
        customerEstablishmentName: selectedBranch,
        destinationAddress: fullAddress || cleanCityName(client.address?.city || "")
      }));
    }
  };

  const handleEmployeeChange = (index, employeeId) => {
    const newEmployeeAssigned = [...formData.employeeAssigned];
    const newRoleOfEmployee = [...formData.roleOfEmployee];

    newEmployeeAssigned[index] = employeeId;
    const selectedEmployee = employees.find(emp => emp.employeeId === employeeId);
    if (selectedEmployee) {
      newRoleOfEmployee[index] = selectedEmployee.role;
    } else {
      newRoleOfEmployee[index] = "";
    }

    setFormData({
      ...formData,
      employeeAssigned: newEmployeeAssigned,
      roleOfEmployee: newRoleOfEmployee
    });
  };

  const addEmployee = () => {
    setFormData({
      ...formData,
      employeeAssigned: [...formData.employeeAssigned, ""],
      roleOfEmployee: [...formData.roleOfEmployee, ""]
    });
  };

  const removeEmployee = (index) => {
    const newEmployeeAssigned = formData.employeeAssigned.filter((_, i) => i !== index);
    const newRoleOfEmployee = formData.roleOfEmployee.filter((_, i) => i !== index);

    setFormData({
      ...formData,
      employeeAssigned: newEmployeeAssigned,
      roleOfEmployee: newRoleOfEmployee
    });
  };

  const getAvailableEmployees = (currentIndex) => {
    const selectedEmployeeIds = formData.employeeAssigned.filter((empId, index) => index !== currentIndex && empId !== "");

    if (currentIndex === 0) {
      return employees.filter(emp =>
        emp.status === "Available" &&
        emp.role === "Driver" &&
        !selectedEmployeeIds.includes(emp.employeeId)
      );
    } else {
      return employees.filter(emp =>
        emp.status === "Available" &&
        emp.role === "Helper" &&
        !selectedEmployeeIds.includes(emp.employeeId)
      );
    }
  };

  const getEmployeeDisplayName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (employee) {
      return `${employee.employeeId} - ${employee.fullName || employee.name || ''}`.trim();
    }
    return employeeId;
  };

  const getVehicleDisplayName = (vehicleType) => {
    const vehicle = vehicles.find(v => v.vehicleType === vehicleType);
    if (vehicle) {
      return `${vehicle.color || ''} ${vehicle.manufacturedBy || ''} ${vehicle.model || ''} - ${vehicle.vehicleType}`.replace(/ +/g, ' ').trim();
    }
    return vehicleType;
  };

  const getAvailableVehicles = () => {
    return vehicles.filter(vehicle => vehicle.status === "Available");
  };

  const handleVehicleChange = (e) => {
    const selectedVehicle = vehicles.find(v => v.vehicleId === e.target.value);
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId: selectedVehicle.vehicleId,
        vehicleType: selectedVehicle.vehicleType,
        plateNumber: selectedVehicle.plateNumber
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicleId: "",
        vehicleType: "",
        plateNumber: ""
      }));
    }
  };

  const formatEmployeeNames = (employeeAssigned) => {
    if (Array.isArray(employeeAssigned)) {
      return employeeAssigned
        .map(empId => getEmployeeDisplayName(empId))
        .join(", ");
    }
    return getEmployeeDisplayName(employeeAssigned);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const form = document.querySelector('form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

 const handleSubmit = async (e) => {
  if (e) e.preventDefault();

  if (currentStep !== 2) {
    return;
  }

  try {
    console.log('🚀 Starting booking submission process...');
    console.log('📝 Current formData:', formData);
    console.log('📍 Current selectedBranches:', selectedBranches);
    console.log('🔄 Trip type:', tripType);

    // Build destinationDeliveries based on trip type
    let destinationDeliveries = [];

    if (tripType === 'multiple') {
      console.log('🛣️ Processing multiple destinations...');
      
      // Validate multiple destinations
      for (let i = 0; i < selectedBranches.length; i++) {
        const branch = selectedBranches[i];
        console.log(`🔍 Validating branch ${i + 1}:`, branch);
        
        if (!branch.branch || branch.branch.trim() === '') {
          alert(`Please select a branch for Stop ${i + 1}`);
          return;
        }
        if (!branch.address || branch.address.trim() === '') {
          alert(`Please ensure destination address is populated for Stop ${i + 1}`);
          return;
        }
        if (!branch.productName || branch.productName.trim() === '') {
          alert(`Please fill in Product Name for Stop ${i + 1}`);
          return;
        }
        if (!branch.numberOfPackages || parseInt(branch.numberOfPackages) <= 0) {
          alert(`Please fill in valid Number of Packages for Stop ${i + 1}`);
          return;
        }
        if (!branch.unitPerPackage || parseInt(branch.unitPerPackage) <= 0) {
          alert(`Please fill in valid Units per Package for Stop ${i + 1}`);
          return;
        }
        if (!branch.grossWeight || parseFloat(branch.grossWeight) <= 0) {
          alert(`Please fill in valid Gross Weight for Stop ${i + 1}`);
          return;
        }
      }
const handleSubmit = async (e) => {
  if (e) e.preventDefault();

  if (currentStep !== 2) {
    return;
  }

  try {
    // Build destinationDeliveries based on trip type
    let destinationDeliveries = [];

    if (tripType === 'multiple') {
      // Validate multiple destinations
      for (let i = 0; i < selectedBranches.length; i++) {
        const branch = selectedBranches[i];
        if (!branch.branch || branch.branch.trim() === '') {
          alert(`Please select a branch for Stop ${i + 1}`);
          return;
        }
        if (!branch.address || branch.address.trim() === '') {
          alert(`Please ensure destination address is populated for Stop ${i + 1}`);
          return;
        }
        if (!branch.productName || branch.productName.trim() === '') {
          alert(`Please fill in Product Name for Stop ${i + 1}`);
          return;
        }
        if (!branch.numberOfPackages || parseInt(branch.numberOfPackages) <= 0) {
          alert(`Please fill in valid Number of Packages for Stop ${i + 1}`);
          return;
        }
        if (!branch.unitPerPackage || parseInt(branch.unitPerPackage) <= 0) {
          alert(`Please fill in valid Units per Package for Stop ${i + 1}`);
          return;
        }
        if (!branch.grossWeight || parseFloat(branch.grossWeight) <= 0) {
          alert(`Please fill in valid Gross Weight for Stop ${i + 1}`);
          return;
        }
      }

      destinationDeliveries = selectedBranches.map((branch, index) => ({
        customerEstablishmentName: branch.branch,
        destinationAddress: branch.address,
        destinationIndex: index,
        typeOfOrder: 'Delivery',
        productName: branch.productName,
        quantity: parseInt(branch.quantity) || 0,
        grossWeight: parseFloat(branch.grossWeight) || 0,
        unitPerPackage: parseInt(branch.unitPerPackage) || 0,
        numberOfPackages: parseInt(branch.numberOfPackages) || 0,
        status: 'pending'
      }));
    } else {
      // Single trip validation
      if (!formData.customerEstablishmentName || formData.customerEstablishmentName.trim() === '') {
        alert('Please select a customer/establishment.');
        return;
      }
      if (!formData.destinationAddress || formData.destinationAddress.trim() === '') {
        alert('Please ensure destination address is populated.');
        return;
      }
      if (!formData.productName || formData.productName.trim() === '') {
        alert('Please fill in Product Name.');
        return;
      }
      if (!formData.numberOfPackages || parseInt(formData.numberOfPackages) <= 0) {
        alert('Please enter a valid number of packages.');
        return;
      }
      if (!formData.unitPerPackage || parseInt(formData.unitPerPackage) <= 0) {
        alert('Please enter valid units per package.');
        return;
      }
      if (!formData.grossWeight || parseFloat(formData.grossWeight) <= 0) {
        alert('Please enter a valid gross weight.');
        return;
      }

      // For single trip, create destinationDeliveries from formData
      destinationDeliveries = [
        {
          customerEstablishmentName: formData.customerEstablishmentName,
          destinationAddress: formData.destinationAddress,
          destinationIndex: 0,
          typeOfOrder: 'Delivery',
          productName: formData.productName,
          quantity: parseInt(formData.quantity) || 0,
          grossWeight: parseFloat(formData.grossWeight) || 0,
          unitPerPackage: parseInt(formData.unitPerPackage) || 0,
          numberOfPackages: parseInt(formData.numberOfPackages) || 0,
          status: 'pending'
        }
      ];
    }

    // Common validation for both trip types
    if (!formData.vehicleId || formData.vehicleId.trim() === '') {
      alert('Please select a vehicle.');
      return;
    }

    if (!formData.plateNumber || formData.plateNumber.trim() === '') {
      alert('⚠️ Plate number is missing! Please go back to Step 1 and reselect the vehicle.');
      return;
    }

    const requiredFields = {
      deliveryFee: 'Delivery Fee',
      companyName: 'Company Name',
      shipperConsignorName: 'Shipper/Consignor',
      originAddress: 'Origin Address',
      vehicleId: 'Vehicle',
      vehicleType: 'Vehicle Type',
      dateNeeded: 'Date Needed',
      timeNeeded: 'Time Needed'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        alert(`Please fill in the ${label} field.`);
        return;
      }
    }

    const validEmployees = formData.employeeAssigned.filter(emp => emp && emp.trim() !== "");
    if (validEmployees.length === 0) {
      alert('Please assign at least one employee.');
      return;
    }

    if (isNaN(formData.deliveryFee) || parseFloat(formData.deliveryFee) <= 0) {
      alert('Please enter a valid delivery fee.');
      return;
    }

    const selectedDate = new Date(formData.dateNeeded);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert('Please select a date that is today or in the future.');
      return;
    }

    // SIMPLIFIED: Only use destinationDeliveries array
    const submitData = {
      // Basic booking info
      companyName: formData.companyName,
      shipperConsignorName: formData.shipperConsignorName,
      originAddress: formData.originAddress,
      
      // Trip configuration
      tripType: tripType,
      numberOfStops: tripType === 'multiple' ? selectedBranches.length : 1,
      
      // Single source of truth for all delivery data
      destinationDeliveries: destinationDeliveries,
      
      // Financial
      deliveryFee: parseFloat(formData.deliveryFee) || 0,
      
      // Vehicle info
      vehicleId: formData.vehicleId,
      vehicleType: formData.vehicleType,
      plateNumber: formData.plateNumber,
      
      // Scheduling
      dateNeeded: new Date(formData.dateNeeded),
      timeNeeded: formData.timeNeeded,
      
      // Staff assignment
      employeeAssigned: Array.isArray(formData.employeeAssigned)
        ? formData.employeeAssigned.filter(emp => emp !== "")
        : [formData.employeeAssigned].filter(emp => emp !== ""),
      roleOfEmployee: Array.isArray(formData.roleOfEmployee)
        ? formData.roleOfEmployee.filter(role => role !== "")
        : [formData.roleOfEmployee].filter(role => role !== ""),
      
      // Location data
      originAddressDetails: originAddressDetails,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null
    };

    console.log('📤 Simplified Submit Data:', JSON.stringify(submitData, null, 2));

    if (editBooking) {
      await axiosClient.put(
        `/api/bookings/${editBooking._id}`,
        submitData
      );
      alert('Booking updated successfully!');
    } else {
      await axiosClient.post("/api/bookings", submitData);
      alert('Booking created successfully!');
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

useEffect(() => {
  if (showModal) {
    console.log('🔍 MODAL OPEN - Current form state:', {
      tripType,
      formData: {
        customerEstablishmentName: formData.customerEstablishmentName,
        destinationAddress: formData.destinationAddress,
        productName: formData.productName
      },
      selectedBranches: selectedBranches
    });
  }
}, [showModal, tripType, formData.customerEstablishmentName, formData.destinationAddress, formData.productName, selectedBranches]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this booking?")) return;

    try {
      await axiosClient.patch(`/api/bookings/${id}/archive`, {
        isArchived: true
      });
      alert('Booking archived successfully');
      fetchBookings();
    } catch (err) {
      console.error('Error archiving booking:', err);
      alert('Error archiving booking. Please try again.');
    }
  };

  const viewBooking = (booking) => {
    navigate(`/dashboard/booking/${booking._id}`);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    // Update addressFormData for UI
    setAddressFormData(prev => {
      if (name === "region") {
        // If NCR is selected, automatically set province to "Metro Manila"
        if (value === "130000000") {
          return { ...prev, region: value, province: "Metro Manila", city: "", barangay: "" };
        }
        return { ...prev, region: value, province: "", city: "", barangay: "" };
      } else if (name === "province") {
        return { ...prev, province: value, city: "", barangay: "" };
      } else if (name === "city") {
        return { ...prev, city: value, barangay: "" };
      } else if (name === "barangay") {
        return { ...prev, barangay: value };
      } else {
        return { ...prev, [name]: value };
      }
    });

    // Update formData to trigger useEffect for data fetching
    if (name === "region" || name === "province" || name === "city" || name === "barangay") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        ...(name === "region" && {
          province: value === "130000000" ? "Metro Manila" : "",
          city: "",
          barangay: ""
        }),
        ...(name === "province" && { city: "", barangay: "" }),
        ...(name === "city" && { barangay: "" })
      }));
    }
  };

  // Address Modal States
  const [showOriginAddressModal, setShowOriginAddressModal] = useState(false);
  const [originAddressDetails, setOriginAddressDetails] = useState({
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    fullAddress: ''
  });

  const [addressFormData, setAddressFormData] = useState({
    street: '',
    region: '',
    province: '',
    city: '',
    barangay: ''
  });

  // Helper function to format address preview
  const formatAddressPreview = () => {
    const { street, barangay, city, province, region } = addressFormData;

    if (!street && !barangay && !city && !province && !region) {
      return "No address selected";
    }

    const barangayName = barangays.find(b => b.code === barangay)?.name || '';
    const cityName = cities.find(c => c.code === city)?.name || '';
    const provinceName = provinces.find(p => p.code === province)?.name || '';
    const regionName = regions.find(r => r.code === region)?.name || '';

    const parts = [
      street,
      barangayName,
      cityName,
      provinceName,
      regionName
    ].filter(Boolean);

    return parts.join(', ') || "Please complete all address fields";
  };

  // Check if address form is valid
  const isAddressFormValid = () => {
    const { street, region, province, city, barangay } = addressFormData;
    return street && region && province && city && barangay;
  };

  // Clear address form
  const clearAddressForm = () => {
    setAddressFormData({
      street: '',
      region: '',
      province: '',
      city: '',
      barangay: ''
    });
  };

  // Save origin address
  const saveOriginAddress = () => {
    if (!isAddressFormValid()) {
      alert('Please complete all address fields');
      return;
    }

    const barangayName = barangays.find(b => b.code === addressFormData.barangay)?.name || '';
    const cityName = cities.find(c => c.code === addressFormData.city)?.name || '';
    const provinceName = provinces.find(p => p.code === addressFormData.province)?.name || '';
    const regionName = regions.find(r => r.code === addressFormData.region)?.name || '';

    const fullAddress = [
      addressFormData.street,
      barangayName,
      cityName,
      provinceName,
      regionName
    ].filter(Boolean).join(', ');

    // Update the origin address details
    setOriginAddressDetails({
      street: addressFormData.street,
      barangay: barangayName,
      city: cityName,
      province: provinceName,
      region: regionName,
      fullAddress: fullAddress
    });

    // Update the main form data
    setFormData(prev => ({
      ...prev,
      originAddress: fullAddress
    }));

    // Close the modal
    setShowOriginAddressModal(false);
  };

  // Initialize address form when opening modal
  const openAddressModal = () => {
    // If we already have origin address details, pre-fill the form
    if (originAddressDetails.fullAddress) {
      setAddressFormData({
        street: originAddressDetails.street || '',
        region: '',
        province: '',
        city: '',
        barangay: ''
      });
    } else {
      clearAddressForm();
    }
    setAddressSearch('');
    setShowOriginAddressModal(true);
  };



  // Address dropdown states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await axios.get("https://psgc.gitlab.io/api/regions/");
        setRegions(res.data);
      } catch (err) {
        console.error("Failed to fetch regions", err);
      }
    };
    fetchRegions();
  }, []);

  // Fetch provinces when region changes
  useEffect(() => {
    if (!formData.region) {
      setProvinces([]);
      return;
    }
    const fetchProvinces = async () => {
      try {
        if (formData.region === "130000000") {
          const districtsRes = await axios.get("https://psgc.gitlab.io/api/regions/130000000/districts/");
          const districts = districtsRes.data;
          let allProvinces = [];
          for (const district of districts) {
            try {
              const provRes = await axios.get(`https://psgc.gitlab.io/api/districts/${district.code}/provinces/`);
              allProvinces = allProvinces.concat(provRes.data);
            } catch (err) {
              if (err.response && err.response.status === 404) {
                continue;
              } else {
                console.error(`Error fetching provinces for district ${district.code}`, err);
              }
            }
          }
          setProvinces(allProvinces);
        } else {
          const res = await axios.get(`https://psgc.gitlab.io/api/regions/${formData.region}/provinces/`);
          setProvinces(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch provinces", err);
      }
    };
    fetchProvinces();
  }, [formData.region]);

  // Fetch cities/municipalities when province changes
  useEffect(() => {
    if (formData.region === "130000000") {
      const fetchNcrCities = async () => {
        try {
          const districtsRes = await axios.get("https://psgc.gitlab.io/api/regions/130000000/districts/");
          const districts = districtsRes.data;
          let allCities = [];
          for (const district of districts) {
            let districtHasProvinces = true;
            let provinces = [];
            try {
              const provRes = await axios.get(`https://psgc.gitlab.io/api/districts/${district.code}/provinces/`);
              provinces = provRes.data;
            } catch (err) {
              if (err.response && err.response.status === 404) {
                districtHasProvinces = false;
              } else {
                console.error(`Error fetching provinces for district ${district.code}`, err);
              }
            }
            if (districtHasProvinces && provinces.length > 0) {
              for (const province of provinces) {
                try {
                  const cityRes = await axios.get(`https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities/`);
                  allCities = allCities.concat(cityRes.data);
                } catch (err) {
                  if (err.response && err.response.status === 404) {
                    continue;
                  } else {
                    console.error(`Error fetching cities for province ${province.code}`, err);
                  }
                }
              }
            } else {
              try {
                const cityRes = await axios.get(`https://psgc.gitlab.io/api/districts/${district.code}/cities-municipalities/`);
                allCities = allCities.concat(cityRes.data);
              } catch (err) {
                if (err.response && err.response.status === 404) {
                  continue;
                } else {
                  console.error(`Error fetching cities for district ${district.code}`, err);
                }
              }
            }
          }
          setCities(allCities);
        } catch (err) {
          console.error("Failed to fetch NCR cities/municipalities", err);
        }
      };
      fetchNcrCities();
      return;
    }
    if (!formData.province) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const res = await axios.get(`https://psgc.gitlab.io/api/provinces/${formData.province}/cities-municipalities/`);
        setCities(res.data);
      } catch (err) {
        console.error("Failed to fetch cities/municipalities", err);
      }
    };
    fetchCities();
  }, [formData.province, formData.region]);

  // Fetch barangays when city/municipality changes
  useEffect(() => {
    if (!formData.city) {
      setBarangays([]);
      return;
    }
    const fetchBarangays = async () => {
      try {
        const res = await axios.get(`https://psgc.gitlab.io/api/cities-municipalities/${formData.city}/barangays/`);
        setBarangays(res.data);
      } catch (err) {
        console.error("Failed to fetch barangays", err);
      }
    };
    fetchBarangays();
  }, [formData.city]);

  // Initialize map when modal opens
  useEffect(() => {
    if (!showOriginAddressModal) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const mapElement = document.getElementById('location-map');
      if (!mapElement) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initializeMap;
        document.body.appendChild(script);
      } else {
        initializeMap();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [showOriginAddressModal]);

  const initializeMap = () => {
    const mapElement = document.getElementById('location-map');
    if (!mapElement || mapRef.current) return;

    const map = window.L.map('location-map').setView(mapCenter, 13);
    mapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Add marker if position exists
    if (markerPosition) {
      const marker = window.L.marker(markerPosition, { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', function (e) {
        const pos = e.target.getLatLng();
        setMarkerPosition([pos.lat, pos.lng]);
        setFormData(prev => ({
          ...prev,
          latitude: pos.lat,
          longitude: pos.lng
        }));
      });
    }

    // Add click event to place/move marker
    map.on('click', function (e) {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', function (e) {
          const pos = e.target.getLatLng();
          setMarkerPosition([pos.lat, pos.lng]);
          setFormData(prev => ({
            ...prev,
            latitude: pos.lat,
            longitude: pos.lng
          }));
        });
      }

      setMarkerPosition([lat, lng]);
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
    });
  };

  // Search address function
  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) return;

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: addressSearch + ', Philippines',
          format: 'json',
          limit: 1
        }
      });

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];

        setMapCenter(newCenter);
        setMarkerPosition(newCenter);
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));

        // Update map view
        if (mapRef.current) {
          mapRef.current.setView(newCenter, 15);

          if (markerRef.current) {
            markerRef.current.setLatLng(newCenter);
          } else {
            const marker = window.L.marker(newCenter, { draggable: true }).addTo(mapRef.current);
            markerRef.current = marker;

            marker.on('dragend', function (e) {
              const pos = e.target.getLatLng();
              setMarkerPosition([pos.lat, pos.lng]);
              setFormData(prev => ({
                ...prev,
                latitude: pos.lat,
                longitude: pos.lng
              }));
            });
          }
        }
      } else {
        alert('Address not found. Please try a different search.');
      }
    } catch (err) {
      console.error('Error searching address:', err);
      alert('Failed to search address. Please try again.');
    }
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
            <p className="text-sm text-gray-600">Manage and track all your bookings</p>
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

      {/* Filters Section - Always Visible */}
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
              <option key={i} value={id}>{id}</option>
            ))}
          </select>

          <select
            value={searchCompanyName}
            onChange={(e) => setSearchCompanyName(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[160px]"
          >
            <option value="">All Companies</option>
            {uniqueCompanyNames.map((company, i) => (
              <option key={i} value={company}>{company}</option>
            ))}
          </select>

          <select
            value={searchProductName}
            onChange={(e) => setSearchProductName(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[160px]"
          >
            <option value="">All Products</option>
            {uniqueProductNames.map((product, i) => (
              <option key={i} value={product}>{product}</option>
            ))}
          </select>

          <select
            value={searchVehicleType}
            onChange={(e) => setSearchVehicleType(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[160px]"
          >
            <option value="">All Vehicle Types</option>
            {uniqueVehicleTypes.map((vehicle, i) => (
              <option key={i} value={vehicle}>{vehicle}</option>
            ))}
          </select>

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status, i) => (
              <option key={i} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm whitespace-nowrap min-w-[140px]"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((date, i) => (
              <option key={i} value={date}>{date}</option>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Reservation ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Trip Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Vehicle</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Employee</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
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
                  <td className="px-6 py-4 text-sm text-gray-900">{startIndex + index + 1}</td>
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
                  <td className="px-6 py-4 text-sm font-mono text-indigo-700 font-semibold">{booking.tripNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{booking.companyName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{booking.productName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getVehicleDisplayName(booking.vehicleType)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.dateNeeded).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(booking.status || "Pending") === "Pending" ? "bg-yellow-100 text-yellow-800" :
                      (booking.status || "Pending") === "In Transit" ? "bg-blue-100 text-blue-800" :
                        (booking.status || "Pending") === "Delivered" ? "bg-green-100 text-green-800" :
                          (booking.status || "Pending") === "Completed" ? "bg-gray-200 text-gray-800" :
                            "bg-gray-100 text-gray-800"
                      }`}>
                      {booking.status || "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatEmployeeNames(booking.employeeAssigned)}
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
                          if (booking.status === "In Transit") {
                            alert("Cannot edit booking while in transit");
                            return;
                          }
                          if (booking.status === "Delivered") {
                            alert("Cannot edit delivered booking");
                            return;
                          }
                          if (booking.status === "Completed") {
                            alert("Cannot edit completed booking");
                            return;
                          }
                          openModal(booking);
                        }}
                        disabled={booking.status === "In Transit" || booking.status === "Delivered" || booking.status === "Completed"}
                        className={`p-2 rounded-lg transition-colors ${booking.status === "In Transit" || booking.status === "Delivered" || booking.status === "Completed"
                          ? "text-gray-400 cursor-not-allowed bg-gray-100"
                          : "text-indigo-600 hover:bg-indigo-50"
                          }`}
                        title={
                          booking.status === "In Transit"
                            ? "Cannot edit booking while in transit"
                            : booking.status === "Delivered"
                              ? "Cannot edit delivered booking"
                              : booking.status === "Completed"
                                ? "Cannot edit completed booking"
                                : "Edit booking"
                        }
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
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
              }`}
          >
            Previous
          </motion.button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Page <span className="font-bold text-purple-700">{currentPage}</span> of <span className="font-bold text-purple-700">{totalPages}</span>
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
              }`}
          >
            Next
          </motion.button>
        </div>
      </motion.div>

      {/* Modal */}
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
                      {currentStep === 1 ? "Step 1: Booking Details" : "Step 2: Schedule & Assign"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= 1 ? 'bg-white text-purple-600 shadow-lg' : 'bg-purple-400/30 text-white'
                        }`}>
                        1
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= 2 ? 'bg-white text-purple-600 shadow-lg' : 'bg-purple-400/30 text-white'
                        }`}>
                        2
                      </div>
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
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (currentStep === 2) {
                    handleSubmit();
                  }
                }} className="p-8 space-y-6">
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {editBooking && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reservation ID</label>
                            <input
                              type="text"
                              value={editBooking.reservationId}
                              disabled
                              className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-purple-50 font-mono text-purple-600 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Trip Number</label>
                            <input
                              type="text"
                              value={editBooking.tripNumber}
                              disabled
                              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50 font-mono text-indigo-600 font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {/* Customer Details & Shipment Route */}
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details & Shipment Route</h3>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Company *</label>
                          <select
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleCompanyChange}
                            required
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          >
                            <option value="">Select from existing records</option>
                            {getUniqueClientNames().map((clientName, index) => (
                              <option key={index} value={clientName}>
                                {clientName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Trip Type Toggle */}
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100 mb-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Trip Type</h3>
                          <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="tripType"
                                value="single"
                                checked={tripType === 'single'}
                                onChange={(e) => {
                                  setTripType(e.target.value);
                                  if (e.target.value === 'single' && selectedBranches.length > 1) {
                                    setSelectedBranches([selectedBranches[0]]);
                                    setFormData(prev => ({
                                      ...prev,
                                      customerEstablishmentName: selectedBranches[0].branch,
                                      destinationAddress: selectedBranches[0].address
                                    }));
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={`w-6 h-6 rounded-full border-2 mr-2 flex items-center justify-center ${tripType === 'single'
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                                }`}>
                                {tripType === 'single' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                              </div>
                              <span className="text-sm font-medium">Single Drop Trip</span>
                            </label>

                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="tripType"
                                value="multiple"
                                checked={tripType === 'multiple'}
                                onChange={(e) => setTripType(e.target.value)}
                                className="sr-only"
                              />
                              <div className={`w-6 h-6 rounded-full border-2 mr-2 flex items-center justify-center ${tripType === 'multiple'
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                                }`}>
                                {tripType === 'multiple' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                              </div>
                              <span className="text-sm font-medium">Multiple Drop Trip</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shipper/Consignor *</label>
                            <input
                              type="text"
                              name="shipperConsignorName"
                              value={formData.shipperConsignorName}
                              onChange={handleChange}
                              required
                              placeholder="Enter Shipper/Consignor Name"
                              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Origin/From *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                name="originAddress"
                                value={formData.originAddress}
                                readOnly
                                required
                                placeholder="Select origin address"
                                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50"
                              />
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={openAddressModal}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
                              >
                                Select Address
                              </motion.button>
                            </div>
                            {formData.originAddress && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Address selected: {formData.originAddress}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className={`gap-4 mt-4 ${tripType === 'single' ? 'grid grid-cols-1 md:grid-cols-2' : ''}`}>
                          <div className={tripType === 'multiple' ? 'w-full' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {tripType === 'single' ? 'Customer/Establishment *' : 'Destinations *'}
                            </label>

                            {tripType === 'multiple' ? (
                              <div className="space-y-4">
                                {selectedBranches.map((branchData, index) => (
                                  <div key={branchData.key} className="border-2 border-indigo-300 rounded-2xl p-5 bg-gradient-to-br from-indigo-50 to-purple-50">
                                    {/* Header */}
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

                                    {/* Branch & Type of Order */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                          Select Branch *
                                        </label>
                                        <select
                                          value={branchData.branch}
                                          onChange={(e) => handleMultipleBranchChange(index, e.target.value)}
                                          required
                                          disabled={!formData.companyName}
                                          className="w-full px-4 py-2.5 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 font-medium"
                                        >
                                          <option value="">Select branch</option>
                                          {formData.companyName && getClientBranches(formData.companyName).map((client) => (
                                            <option
                                              key={client.clientBranch}
                                              value={client.clientBranch}
                                              disabled={selectedBranches.some((b, i) => i !== index && b.branch === client.clientBranch)}
                                            >
                                              {client.clientBranch}
                                              {selectedBranches.some((b, i) => i !== index && b.branch === client.clientBranch) ? ' (Selected)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Destination Address */}
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

                                    {/* Product Details Form */}
                                    <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                                      <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                                        📋 Product Details for this Stop
                                      </h4>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Product Name *
                                          </label>
                                          <input
                                            type="text"
                                            value={branchData.productName}
                                            onChange={(e) => handleBranchProductChange(index, 'productName', e.target.value)}
                                            placeholder="e.g., Tasty Boy"
                                            required
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Number of Packages *
                                          </label>
                                          <input
                                            type="number"
                                            value={branchData.numberOfPackages}
                                            onChange={(e) => handleBranchProductChange(index, 'numberOfPackages', e.target.value)}
                                            placeholder="e.g., 10"
                                            required
                                            min="1"
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Units per Package *
                                          </label>
                                          <input
                                            type="number"
                                            value={branchData.unitPerPackage}
                                            onChange={(e) => handleBranchProductChange(index, 'unitPerPackage', e.target.value)}
                                            placeholder="e.g., 200"
                                            required
                                            min="1"
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Total Quantity (Auto)
                                          </label>
                                          <input
                                            type="number"
                                            value={branchData.quantity}
                                            readOnly
                                            placeholder="Auto-calculated"
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg bg-purple-50/70 text-gray-700 text-sm font-semibold"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Gross Weight (tons) *
                                          </label>
                                          <input
                                            type="number"
                                            value={branchData.grossWeight}
                                            onChange={(e) => handleBranchProductChange(index, 'grossWeight', e.target.value)}
                                            placeholder="e.g., 5.5"
                                            required
                                            min="0.1"
                                            step="0.1"
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                                          />
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
                                  disabled={!formData.companyName || !hasAvailableBranches()}
                                  className="w-full px-5 py-4 bg-gradient-to-r from-purple-300 to-purple-800 text-white rounded-xl hover:from-purple-500 hover:to-purple-900 transition-all duration-300 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  ➕ Add Another Destination
                                </motion.button>

                                {!hasAvailableBranches() && selectedBranches.length > 0 && (
                                  <p className="text-sm text-amber-600 text-center font-medium">
                                    ⚠️ All available branches have been selected
                                  </p>
                                )}
                              </div>
                            ) : (
                              // Single destination remains the same
                              <select
                                name="customerEstablishmentName"
                                value={formData.customerEstablishmentName}
                                onChange={handleBranchChange}
                                required
                                disabled={!formData.companyName}
                                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100"
                              >
                                <option value="">Select branch</option>
                                {formData.companyName && getClientBranches(formData.companyName).map((client, index) => (
                                  <option key={index} value={client.clientBranch}>
                                    {client.clientBranch}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {tripType === 'single' ? 'Destination/To *' : 'Destinations Preview'}
                            </label>

                            {tripType === 'single' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Destination/To *
                                </label>
                                <input
                                  type="text"
                                  name="destinationAddress"
                                  value={formData.destinationAddress}
                                  readOnly
                                  placeholder="Select branch first"
                                  className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50"
                                />
                              </div>
                            )}
                          </div>

                          {/* Multiple Destinations Preview - Moved below destinations */}
                          {tripType === 'multiple' && (
                            <div className="mt-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Destinations Preview
                              </label>
                              <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-indigo-200">
                                {selectedBranches.map((branchData, index) => (
                                  <div key={branchData.key} className="text-sm">
                                    <div className="font-medium text-gray-700">Stop {index + 1}: {branchData.branch || 'Not selected'}</div>
                                    {branchData.address && (
                                      <div className="text-xs text-gray-500 truncate">{branchData.address}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {tripType === 'single' && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                          <input
                            type="text"
                            name="productName"
                            value={formData.productName}
                            onChange={handleChange}
                            placeholder="Tasty Boy"
                            required
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Packages *</label>
                          <input
                            type="number"
                            name="numberOfPackages"
                            value={formData.numberOfPackages}
                            onChange={handleChange}
                            required
                            min="1"
                            placeholder="10"
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Units per Package *</label>
                          <input
                            type="number"
                            name="unitPerPackage"
                            value={formData.unitPerPackage}
                            onChange={handleChange}
                            required
                            min="1"
                            placeholder="200"
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Auto) *</label>
                          <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            readOnly
                            placeholder="Auto-calculated"
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl bg-purple-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gross Weight (tons) *</label>
                          <input
                            type="number"
                            name="grossWeight"
                            value={formData.grossWeight}
                            onChange={handleChange}
                            placeholder="5"
                            required
                            min="0.1"
                            step="0.1"
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee (PHP) *</label>
                          <input
                            type="number"
                            name="deliveryFee"
                            value={formData.deliveryFee}
                            onChange={handleChange}
                            required
                            placeholder="10000"
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Area Rate & Vehicle Info */}
                  <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-2xl border border-violet-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Area Rate & Vehicle Info</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Vehicle *</label>
                      <select
                        name="vehicleId"
                        value={formData.vehicleId}
                        onChange={handleVehicleChange}
                        required
                        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      >
                        <option value="">Select Vehicle</option>
                        {(() => {
                          // Safely handle address strings to prevent .toLowerCase() errors
                          const origin = typeof formData.originAddress === 'string' ? formData.originAddress : '';
                          const destination = typeof formData.destinationAddress === 'string' ? formData.destinationAddress : '';

                          const key = `${origin?.toLowerCase()} - ${destination?.toLowerCase()}`;
                          const allowedVehiclesArr = addressDefaults[key];
                          const allowedVehicleTypes = Array.isArray(allowedVehiclesArr)
                            ? allowedVehiclesArr.map(def => def.vehicleType)
                            : [];

                          return getAvailableVehicles()
                            .filter(vehicle => allowedVehicleTypes.length === 0 || allowedVehicleTypes.includes(vehicle.vehicleType))
                            .map(vehicle => (
                              <option key={vehicle._id} value={vehicle.vehicleId}>
                                {`${vehicle.vehicleId} - ${vehicle.manufacturedBy} ${vehicle.model} (${vehicle.vehicleType}) - ${vehicle.plateNumber}`}
                              </option>
                            ));
                        })()}
                      </select>
                    </div>
                  </div>
              </div>
                  )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Scheduling */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                        <input
                          type="date"
                          name="dateNeeded"
                          value={formData.dateNeeded}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                        <input
                          type="time"
                          name="timeNeeded"
                          value={formData.timeNeeded}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assign Employees & Roles */}
                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Employees & Roles</h3>

                    {formData.employeeAssigned.map((employeeId, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-indigo-200 rounded-xl bg-white/50">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {index === 0 ? "Select Driver *" : "Select Helper"}
                          </label>
                          <select
                            value={employeeId}
                            onChange={(e) => handleEmployeeChange(index, e.target.value)}
                            required
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          >
                            <option value="">{index === 0 ? "Select Driver" : "Select Helper"}</option>
                            {getAvailableEmployees(index).map((employee) => (
                              <option key={employee._id} value={employee.employeeId}>
                                {`${employee.employeeId} - ${employee.fullName || employee.name || ''}`.trim()}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
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
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
                >
                  Cancel
                </motion.button>

                <div className="flex gap-3">
                  {currentStep === 2 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={prevStep}
                      className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all duration-300 shadow-md inline-flex items-center gap-2"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </motion.button>
                  )}

                  {currentStep < 2 ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
                    >
                      Next
                      <ChevronRight size={18} />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleSubmit}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                    >
                      {editBooking ? "Update Booking" : "Create Booking"}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
            </motion.div>
    </motion.div>
  )
}
      </AnimatePresence >

  {/* Origin Address Selection Modal */ }
  < AnimatePresence >
  { showOriginAddressModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => setShowOriginAddressModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-indigo-100"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 rounded-t-3xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Select Origin Address
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Fill in the complete address details
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOriginAddressModal(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} className="text-white" />
            </motion.button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6">
          {/* Street Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={addressFormData.street}
              onChange={(e) => setAddressFormData(prev => ({
                ...prev,
                street: e.target.value
              }))}
              placeholder="House number, street name, building"
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region *
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleAddressChange}
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          {formData.region !== "130000000" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province *
              </label>
              <select
                name="province"
                value={formData.province}
                onChange={handleAddressChange}
                disabled={!formData.region}
                className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Select Province</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
              <div className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-gray-50 text-gray-700">
                Metro Manila (National Capital Region)
              </div>
            </div>
          )}


          {/* City/Municipality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City/Municipality *
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleAddressChange}
              disabled={!formData.province}
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select City/Municipality</option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barangay *
            </label>
            <select
              name="barangay"
              value={formData.barangay}
              onChange={handleAddressChange}
              disabled={!formData.city}
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Barangay</option>
              {barangays.map((barangay) => (
                <option key={barangay.code} value={barangay.code}>
                  {barangay.name}
                </option>
              ))}
            </select>
          </div>

          {/* Address Preview */}
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <h3 className="text-sm font-semibold text-indigo-800 mb-2">Address Preview:</h3>
            <p className="text-sm text-indigo-600">
              {formatAddressPreview()}
            </p>
          </div>
        </div>

        {/* Location Pinning with Map */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-2xl border border-violet-100 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-purple-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Pin Your Location</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Search your address or click on the map to pin your exact location. You can also drag the marker to adjust.
          </p>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => setAddressSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
              placeholder="Search address (e.g., Quezon City, Metro Manila)..."
              className="flex-1 px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleAddressSearch}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
            >
              <Search size={18} />
              Search
            </motion.button>
          </div>

          {/* FIXED: Wrapped map in container with proper height constraints */}
          <div className="relative overflow-hidden rounded-xl">
            <div
              id="location-map"
              className="w-full rounded-xl shadow-lg border-2 border-violet-200"
              style={{ height: '384px', minHeight: '384px', maxHeight: '384px' }}
            ></div>
          </div>

          {markerPosition && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-violet-200">
              <p className="text-xs text-gray-600">
                <strong>Coordinates:</strong> {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200">
          <div className="flex justify-between items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowOriginAddressModal(false)}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
            >
              Cancel
            </motion.button>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={clearAddressForm}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all duration-300"
              >
                Clear
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={saveOriginAddress}
                disabled={!isAddressFormValid()}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use This Address
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
      </AnimatePresence >
    </div >
  );
}

export default Booking;
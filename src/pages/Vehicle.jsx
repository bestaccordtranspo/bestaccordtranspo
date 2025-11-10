import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Trash2, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "../api/axiosClient";

import { motion, AnimatePresence } from "framer-motion";

export default function Vehicle() {
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  //search states
  const [searchDateRange, setSearchDateRange] = useState("");
  const [searchVehicleType, setSearchVehicleType] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchManufacturedBy, setSearchManufacturedBy] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");

  // Unique filter values
  const [uniqueDates, setUniqueDates] = useState([]);
  const [uniqueVehicleTypes, setuniqueVehicleTypes] = useState([]);
  const [uniqueStatus, setUniqueStatus] = useState([]);
  const [uniqueManufacturedBy, setuniqueManufacturedBy] = useState([]);

  //Form state
  const [formData, setFormData] = useState({
    registrationNumber: "",
    manufacturedBy: "",
    model: "",
    plateNumber: "",
    vehicleType: "6-Wheeler",
    color: "",
    chassisNumber: "",
    engineNumber: "",
    registrationExpiryDate: "",
    status: "Available",
    maxWeightCapacity: "",
    kmRate: ""  
  });

  const containerRef = useRef(null);
  const brands = ["Toyota", "Ford", "Mitsubishi", "Honda", "Isuzu", "Nissan"];
  const vehicleTypes = ["6-Wheeler", "4-Wheeler"];
  const statuses = ["Available", "Not Available", "On Trip"];

  const fetchVehicles = async () => {
    try {
      const res = await axiosClient.get("/api/vehicles");
      // Filter out archived Vehicles
      const activeVehicles = res.data.filter(vehicle => !vehicle.isArchived);
      setVehicles(activeVehicles);
      setFilteredVehicles(activeVehicles);

      // Extract unique values
      setuniqueManufacturedBy([...new Set(res.data.map((c) => c.manufacturedBy))]);
      setuniqueVehicleTypes([...new Set(res.data.map((c) => c.vehicleType))]);
      setUniqueStatus([...new Set(res.data.map((c) => c.status))]);
      setUniqueDates([
        ...new Set(
          res.data.map((c) =>
            new Date(c.registrationExpiryDate).toLocaleDateString()
          )
        ),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  //Filter function
  useEffect(() => {
    let results = vehicles;

    if (searchDateRange) {
      results = results.filter((vhcl) => vhcl.registrationExpiryDate === searchDateRange);
    }
    if (searchVehicleType) {
      results = results.filter((vhcl) => vhcl.vehicleType === searchVehicleType);
    }
    if (searchStatus) {
      results = results.filter((vhcl) => vhcl.status === searchStatus);
    }
    if (searchManufacturedBy) {
      results = results.filter((vhcl) => vhcl.manufacturedBy === searchManufacturedBy);
    }
    if (generalSearch) {
      results = results.filter(
        (vhcl) =>
          vhcl.registrationExpiryDate?.toLowerCase().includes(generalSearch.toLowerCase()) ||
          vhcl.vehicleType?.toLowerCase().includes(generalSearch.toLowerCase()) ||
          vhcl.status?.includes(generalSearch) ||
          vhcl.manufacturedBy?.toLowerCase().includes(generalSearch.toLowerCase())
      );
    }
    setFilteredVehicles(results);
    setCurrentPage(1);
  }, [searchDateRange, searchVehicleType, searchStatus, searchManufacturedBy, generalSearch, vehicles]);

  // Pagination logic
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = filteredVehicles.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Modal handlers
  const openModal = (vehicle = null) => {
    if (vehicle) {
      setEditVehicle(vehicle);
      setFormData({
        registrationNumber: vehicle.registrationNumber,
        manufacturedBy: vehicle.manufacturedBy,
        model: vehicle.model,
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        color: vehicle.color,
        chassisNumber: vehicle.chassisNumber,
        engineNumber: vehicle.engineNumber,
        registrationExpiryDate: vehicle.registrationExpiryDate
          ? vehicle.registrationExpiryDate.slice(0, 10)
          : "",
        status: vehicle.status,
        maxWeightCapacity: vehicle.maxWeightCapacity ?? "",
        kmRate: vehicle.kmRate ?? ""
      });
    } else {
      setEditVehicle(null);
      setFormData({
        registrationNumber: "",
        manufacturedBy: "",
        model: "",
        plateNumber: "",
        vehicleType: "6-Wheeler",
        color: "",
        chassisNumber: "",
        engineNumber: "",
        registrationExpiryDate: "",
        status: "Available",
        maxWeightCapacity: "",
        kmRate: ""
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Frontend validation for vehicle form
  const validateForm = () => {
    let newErrors = {};
    if (!(formData.registrationNumber || "").trim()) newErrors.registrationNumber = "Registration number is required.";
    if (!formData.manufacturedBy) newErrors.manufacturedBy = "Manufacturer is required.";
    if (!(formData.model || "").trim()) newErrors.model = "Model is required.";
    if (!(formData.plateNumber || "").trim()) newErrors.plateNumber = "Plate number is required.";
    if (!formData.vehicleType) newErrors.vehicleType = "Vehicle type is required.";
    if (!formData.status) newErrors.status = "Status is required.";
    if (formData.registrationExpiryDate && isNaN(Date.parse(formData.registrationExpiryDate))) newErrors.registrationExpiryDate = "Invalid expiry date.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editVehicle) {
        await axiosClient.put(
          `/api/vehicles/${editVehicle._id}`,
          { ...formData, vehicleId: editVehicle.vehicleId }
        );
      } else {
        const { vehicleId, ...dataToSend } = formData;
        await axiosClient.post("/api/vehicles", dataToSend);
      }
      closeModal();
      fetchVehicles();
      setErrors({});
    } catch (err) {
      let backendErrors = {};
      if (err.response?.data?.errors) {
        backendErrors = err.response.data.errors;
      } else if (err.response?.data?.message) {
        backendErrors.general = err.response.data.message;
      } else {
        backendErrors.general = "Error adding/updating vehicle.";
      }
      setErrors(backendErrors);
      console.error(err);
    }
  };

  //Archive handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this vehicle?")) return;
    try {
      await axiosClient.patch(`/api/vehicles/${id}/archive`, {
        isArchived: true
      });
      alert('Vehicle archived successfully');
      fetchVehicles();
    } catch (err) {
      console.error('Error archiving vehicle:', err);
      alert('Error archiving vehicle. Please try again.');
    }
  };

  //Navigate to Vehicle Info Page
  const viewVehicle = (vehicle) => {
    navigate(`/dashboard/vehicle/${vehicle._id}`);
  };

  // Add this helper function at the top of your component
  const getDisplayID = (index, vehicle) => {
    return vehicle.vehicleId ? vehicle.vehicleId : `V${String(index + 1).padStart(3, "0")}`;
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Purple Theme */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl -z-10"></div>
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-2">
              Vehicles
            </h1>
            <p className="text-sm text-gray-600">Manage and track your fleet</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform transition-all duration-300 font-medium"
          >
            <Plus size={20} />
            Add Vehicle
          </motion.button>
        </div>
      </motion.div>

      {/* Enhanced Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <select
            value={searchDateRange}
            onChange={(e) => setSearchDateRange(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((registrationExpiryDate, i) => (
              <option key={i} value={registrationExpiryDate}>
                {registrationExpiryDate}
              </option>
            ))}
          </select>

          <select
            value={searchVehicleType}
            onChange={(e) => setSearchVehicleType(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Vehicle Types</option>
            {uniqueVehicleTypes.map((vehicleType, i) => (
              <option key={i} value={vehicleType}>
                {vehicleType}
              </option>
            ))}
          </select>

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Status</option>
            {uniqueStatus.map((status, i) => (
              <option key={i} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={searchManufacturedBy}
            onChange={(e) => setSearchManufacturedBy(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Brands</option>
            {uniqueManufacturedBy.map((manufacturedBy, i) => (
              <option key={i} value={manufacturedBy}>
                {manufacturedBy}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search anything..."
            value={generalSearch}
            onChange={(e) => setGeneralSearch(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          />
        </div>
      </motion.div>

      {/* Enhanced Table */}
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Vehicle ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Vehicle</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Wheels</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plate Number</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {paginatedVehicles.map((v, index) => (
                <motion.tr
                  key={v._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-purple-50/50 transition-colors duration-200"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">{startIndex + index + 1}</td>
                  <td className="px-6 py-4 text-sm font-mono">
                    <motion.button
                      onClick={() => viewVehicle(v)}
                      className="text-purple-700 font-semibold hover:text-purple-900 underline cursor-pointer bg-transparent border-none p-0"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {getDisplayID(startIndex + index, v)}
                    </motion.button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{v.manufacturedBy} {v.model}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{v.vehicleType === "6-Wheeler" ? 6 : 4}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{v.plateNumber}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${v.status === "Available"
                        ? "bg-green-100 text-green-800"
                        : v.status === "On Trip"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => viewVehicle(v)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View vehicle"
                      >
                        <Eye size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(v)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit vehicle"
                      >
                        <Pencil size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(v._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Archive vehicle"
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

        {/* Enhanced Pagination */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-t border-purple-100">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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

      {/* Enhanced Modal */}
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-purple-100"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 rounded-t-3xl z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      {editVehicle ? "Update vehicle information" : "Enter vehicle details"}
                    </p>
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

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Vehicle Registration */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Registration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number *</label>
                      <input
                        type="text"
                        name="registrationNumber"
                        placeholder="Enter registration number"
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.registrationNumber ? 'border-red-500' : 'border-purple-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent`}
                      />
                      {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Expiry Date</label>
                      <input
                        type="date"
                        name="registrationExpiryDate"
                        value={formData.registrationExpiryDate}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border ${errors.registrationExpiryDate ? 'border-red-500' : 'border-purple-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent`}
                      />
                      {errors.registrationExpiryDate && <p className="text-red-500 text-xs mt-1">{errors.registrationExpiryDate}</p>}
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer *</label>
                      <select
                        name="manufacturedBy"
                        value={formData.manufacturedBy}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.manufacturedBy ? 'border-red-500' : 'border-indigo-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent`}
                      >
                        <option value="">Select Manufacturer</option>
                        {brands.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {errors.manufacturedBy && <p className="text-red-500 text-xs mt-1">{errors.manufacturedBy}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                      <input
                        type="text"
                        name="model"
                        placeholder="Enter model"
                        value={formData.model}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.model ? 'border-red-500' : 'border-indigo-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent`}
                      />
                      {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plate Number *</label>
                      <input
                        type="text"
                        name="plateNumber"
                        placeholder="Enter plate number"
                        value={formData.plateNumber}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.plateNumber ? 'border-red-500' : 'border-indigo-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent`}
                      />
                      {errors.plateNumber && <p className="text-red-500 text-xs mt-1">{errors.plateNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type *</label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.vehicleType ? 'border-red-500' : 'border-indigo-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent`}
                      >
                        {vehicleTypes.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                      <input
                        type="text"
                        name="color"
                        placeholder="Enter color"
                        value={formData.color}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-2.5 border ${errors.status ? 'border-red-500' : 'border-indigo-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                    </div>
                  </div>
                </div>

                {/* Technical Information */}
                <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-2xl border border-violet-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number</label>
                      <input
                        type="text"
                        name="chassisNumber"
                        placeholder="Enter chassis number"
                        value={formData.chassisNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Engine Number</label>
                      <input
                        type="text"
                        name="engineNumber"
                        placeholder="Enter engine number"
                        value={formData.engineNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Weight Capacity (kg)</label>
                      <input
                        type="number"
                        name="maxWeightCapacity"
                        placeholder="Enter max weight capacity"
                        value={formData.maxWeightCapacity}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">fare per Kilometer (KM)</label>
                      <input
                        type="number"
                        name="kmRate"
                        placeholder="Enter base rate per Kilometer (KM)"
                        value={formData.kmRate}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm text-center">{errors.general}</p>
                  </div>
                )}
              </form>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200">
                <div className="flex justify-end items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                  >
                    {editVehicle ? "Update Vehicle" : "Add Vehicle"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
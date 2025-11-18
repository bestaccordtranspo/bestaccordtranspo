import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Trash2, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "../api/axiosClient";

import { motion, AnimatePresence } from "framer-motion";

function Employee() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");
  const containerRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    role: "Driver",
    employmentType: "Full-time",
    mobileNumber: "",
    currentAddress: "",
    permanentAddress: "",
    sameAsCurrent: false,
    emergencyContactName: "",
    emergencyContactNumber: "",
    dateHired: "",
    shift: "Morning",
    username: "",
    password: "",
  });

  const roles = ["Driver", "Helper"];
  const employmentTypes = ["Full-time", "Part-time", "Contractual"];
  const shifts = ["Morning", "Afternoon", "Night"];

  const fetchEmployees = async () => {
    try {
      const res = await axiosClient.get("/api/employees");
      const activeEmployees = res.data.filter((emp) => !emp.isArchived);
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    let results = employees;

    if (searchId) {
      results = results.filter((emp) =>
        emp.employeeId?.toLowerCase().includes(searchId.toLowerCase())
      );
    }
    if (searchName) {
      results = results.filter((emp) =>
        emp.fullName?.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (searchRole) {
      results = results.filter((emp) => emp.role === searchRole);
    }
    if (searchMobile) {
      results = results.filter((emp) =>
        emp.mobileNumber?.includes(searchMobile)
      );
    }
    if (generalSearch) {
      results = results.filter(
        (emp) =>
          emp.employeeId?.toLowerCase().includes(generalSearch.toLowerCase()) ||
          emp.fullName?.toLowerCase().includes(generalSearch.toLowerCase()) ||
          emp.role?.toLowerCase().includes(generalSearch.toLowerCase()) ||
          emp.mobileNumber?.includes(generalSearch) ||
          (emp.username || "")
            .toLowerCase()
            .includes(generalSearch.toLowerCase())
      );
    }

    setFilteredEmployees(results);
    setCurrentPage(1);
  }, [
    searchId,
    searchName,
    searchRole,
    searchMobile,
    generalSearch,
    employees,
  ]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const openModal = (employee = null) => {
    if (employee) {
      setEditEmployee(employee);
      const { employeeId, ...data } = employee;
      setFormData(data);
    } else {
      setEditEmployee(null);
      setFormData({
        fullName: "",
        role: "Driver",
        employmentType: "Full-time",
        mobileNumber: "",
        currentAddress: "",
        permanentAddress: "",
        sameAsCurrent: false,
        emergencyContactName: "",
        emergencyContactNumber: "",
        dateHired: "",
        shift: "Morning",
        username: "",
        password: "",
      });
    }
    setStep(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "mobileNumber" || name === "emergencyContactNumber") {
      if (/^\d{0,11}$/.test(value)) {
        setFormData({ ...formData, [name]: value });
      }
    } else if (name === "sameAsCurrent") {
      setFormData((prev) => ({
        ...prev,
        sameAsCurrent: checked,
        permanentAddress: checked ? prev.currentAddress : prev.permanentAddress,
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateStep = () => {
    let newErrors = {};

    if (step === 1) {
      if (!(formData.fullName || "").trim())
        newErrors.fullName = "Full name is required.";
      if (!formData.role) newErrors.role = "Role is required.";
      if (!formData.employmentType)
        newErrors.employmentType = "Employment type is required.";
      if (!(formData.mobileNumber || "").trim()) {
        newErrors.mobileNumber = "Mobile number is required.";
      } else if (!/^\d{11}$/.test(formData.mobileNumber || "")) {
        newErrors.mobileNumber = "Mobile number must be exactly 11 digits.";
      }
      if (!(formData.currentAddress || "").trim())
        newErrors.currentAddress = "Current address is required.";
      if (!(formData.permanentAddress || "").trim())
        newErrors.permanentAddress = "Permanent address is required.";
      if (!(formData.emergencyContactName || "").trim())
        newErrors.emergencyContactName = "Emergency contact name is required.";
      if (!(formData.emergencyContactNumber || "").trim()) {
        newErrors.emergencyContactNumber =
          "Emergency contact number is required.";
      } else if (!/^\d{11}$/.test(formData.emergencyContactNumber || "")) {
        newErrors.emergencyContactNumber =
          "Emergency contact number must be exactly 11 digits.";
      }
      if (!formData.dateHired) newErrors.dateHired = "Date hired is required.";
      if (!formData.shift) newErrors.shift = "Shift selection is required.";
    }

    if (step === 2) {
      if (!(formData.username || "").trim()) {
        newErrors.username = "Username is required.";
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username =
          "Username can only contain letters, numbers and underscores.";
      }
      if (!formData.password.trim()) {
        newErrors.password = "Password is required.";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) {
      return;
    }
    try {
      if (editEmployee) {
        await axiosClient.put(`/api/employees/${editEmployee._id}`, {
          ...formData,
          employeeId: editEmployee.employeeId,
        });
      } else {
        const { employeed, sameAsCurrent, ...dataToSend } = formData;
        await axiosClient.post("/api/employees", dataToSend);
      }
      closeModal();
      fetchEmployees();
    } catch (err) {
      let backendErrors = {};
      if (err.response?.data?.errors) {
        backendErrors = err.response.data.errors;
      } else if (err.response?.data?.message) {
        backendErrors.general = err.response.data.message;
      } else {
        backendErrors.general = "Error adding/updating employee";
      }
      setErrors(backendErrors);
      console.error("Error adding/updating employee:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this employee?"))
      return;
    try {
      await axiosClient.patch(`/api/employees/${id}/archive`, {
        isArchived: true,
      });
      alert("Employee archived successfully");
      fetchEmployees();
    } catch (err) {
      console.error("Error archiving employee:", err);
      alert("Error archiving employee. Please try again.");
    }
  };

  const getDisplayID = (index, emp) => {
    return emp.employeeId
      ? emp.employeeId
      : `EMP${String(index + 1).padStart(3, "0")}`;
  };

  const viewEmployee = (employee) => {
    navigate(`/dashboard/employee/${employee._id}`);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl -z-10"></div>
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-2">
              Drivers/Helpers
            </h1>
            <p className="text-sm text-gray-600">
              Manage your workforce and staff
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform transition-all duration-300 font-medium"
          >
            <Plus size={20} />
            Add Employee
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search Employee ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          />
          <input
            type="text"
            placeholder="Search Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          />
          <select
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Roles</option>
            <option value="Driver">Driver</option>
            <option value="Helper">Helper</option>
          </select>
          <input
            type="text"
            placeholder="Search Mobile"
            value={searchMobile}
            onChange={(e) => setSearchMobile(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          />
          <input
            type="text"
            placeholder="General Search"
            value={generalSearch}
            onChange={(e) => setGeneralSearch(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          />
        </div>
      </motion.div>

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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Employee ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Full Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Mobile Number
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {paginatedEmployees.map((emp, index) => (
                <motion.tr
                  key={emp._id}
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
                      onClick={() => viewEmployee(emp)}
                      className="text-purple-700 font-semibold hover:text-purple-900 underline cursor-pointer bg-transparent border-none p-0"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {getDisplayID(index, emp)}
                    </motion.button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {emp.fullName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {emp.role}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {emp.mobileNumber}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        emp.status === "Available"
                          ? "bg-green-100 text-green-800"
                          : emp.status === "On Trip"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => viewEmployee(emp)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(emp)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(emp._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100"
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 rounded-t-3xl z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editEmployee ? "Edit Employee" : "Add Employee"}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      {step === 1
                        ? "Step 1: Personal Information"
                        : "Step 2: Account Details"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                          step >= 1
                            ? "bg-white text-purple-600 shadow-lg"
                            : "bg-purple-400/30 text-white"
                        }`}
                      >
                        1
                      </div>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                          step >= 2
                            ? "bg-white text-purple-600 shadow-lg"
                            : "bg-purple-400/30 text-white"
                        }`}
                      >
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

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* show backend/general errors */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
                    {errors.general}
                  </div>
                )}
                {step === 1 ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                          {errors.fullName && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.fullName}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role *
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Employment Type *
                          </label>
                          <select
                            name="employmentType"
                            value={formData.employmentType}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          >
                            {employmentTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mobile Number *
                          </label>
                          <input
                            type="text"
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            maxLength={11}
                            required
                            className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                          {errors.mobileNumber && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.mobileNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Address Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Address *
                          </label>
                          <input
                            type="text"
                            name="currentAddress"
                            value={formData.currentAddress}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Permanent Address *
                          </label>
                          <input
                            type="text"
                            name="permanentAddress"
                            value={formData.permanentAddress}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="sameAsCurrent"
                            checked={formData.sameAsCurrent}
                            onChange={handleChange}
                            id="sameAsCurrent"
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                          />
                          <label
                            htmlFor="sameAsCurrent"
                            className="text-sm text-gray-700"
                          >
                            Same as Current Address
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 rounded-2xl border border-violet-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Emergency Contact & Employment
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emergency Contact Name *
                          </label>
                          <input
                            type="text"
                            name="emergencyContactName"
                            value={formData.emergencyContactName}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emergency Contact Number *
                          </label>
                          <input
                            type="text"
                            name="emergencyContactNumber"
                            value={formData.emergencyContactNumber}
                            onChange={handleChange}
                            maxLength={11}
                            className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Hired *
                          </label>
                          <input
                            type="date"
                            name="dateHired"
                            value={formData.dateHired}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Work Shift
                      </h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {shifts.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() =>
                              setFormData({ ...formData, shift: s })
                            }
                            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                              formData.shift === s
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                                : "bg-white border-2 border-purple-200 text-gray-700 hover:border-purple-400"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Account Credentials
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username *
                          </label>
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                          {errors.username && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.username}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                          {errors.password && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.password}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200">
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
                    {step === 2 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all duration-300 shadow-md"
                      >
                        Back
                      </motion.button>
                    )}

                    {step < 2 ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => {
                          if (validateStep()) setStep(2);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                      >
                        Next
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                      >
                        {editEmployee ? "Update Employee" : "Add Employee"}
                      </motion.button>
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

export default Employee;

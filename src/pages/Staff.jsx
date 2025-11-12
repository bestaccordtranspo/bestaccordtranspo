import { useState, useEffect } from "react";
import { UserPlus, Power, PowerOff, Pencil, Trash2, X, Mail, User, Lock } from "lucide-react";
import { axiosClient } from "../api/axiosClient";
import { motion, AnimatePresence } from "framer-motion";

export default function Staff() {
    const [staff, setStaff] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editStaff, setEditStaff] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "staff"
    });

    const fetchStaff = async () => {
        try {
            const res = await axiosClient.get("/api/staffs");
            const activeStaff = res.data.filter(s => !s.isArchived);
            setStaff(activeStaff);
            setFilteredStaff(activeStaff);
        } catch (err) {
            console.error("Error fetching staff:", err);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        const filtered = staff.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredStaff(filtered);
    }, [searchTerm, staff]);

    const openModal = (staffMember = null) => {
        if (staffMember) {
            setEditStaff(staffMember);
            setFormData({
                name: staffMember.name,
                email: staffMember.email,
                password: "",
                role: staffMember.role || "staff"
            });
        } else {
            setEditStaff(null);
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "staff"
            });
        }
        setErrors({});
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setErrors({});
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        if (!editStaff && !formData.password.trim()) {
            newErrors.password = "Password is required";
        } else if (formData.password && formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (editStaff) {
                // Update staff
                const dataToSend = { ...formData };
                if (!dataToSend.password) {
                    delete dataToSend.password; // Don't update password if empty
                }
                await axiosClient.put(`/api/staffs/${editStaff._id}`, dataToSend);
                alert("Staff updated successfully!");
            } else {
                // Create new staff
                await axiosClient.post("/api/staffs", formData);
                alert("Staff created successfully!");
            }
            closeModal();
            fetchStaff();
        } catch (err) {
            console.error("Error saving staff:", err);
            if (err.response?.data?.msg) {
                setErrors({ general: err.response.data.msg });
            } else {
                setErrors({ general: "Error saving staff. Please try again." });
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const action = currentStatus ? "disable" : "enable";
        if (!window.confirm(`Are you sure you want to ${action} this staff member's login?`)) return;

        try {
            await axiosClient.patch(`/api/staffs/${id}/toggle-status`, {
                isEnabled: !currentStatus
            });
            alert(`Staff ${action}d successfully!`);
            fetchStaff();
        } catch (err) {
            console.error("Error toggling staff status:", err);
            alert("Error updating staff status. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to archive this staff member?")) return;

        try {
            await axiosClient.patch(`/api/staffs/${id}/archive`, {
                isArchived: true
            });
            alert("Staff archived successfully!");
            fetchStaff();
        } catch (err) {
            console.error("Error archiving staff:", err);
            alert("Error archiving staff. Please try again.");
        }
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
                            Staff Management
                        </h1>
                        <p className="text-sm text-gray-600">Manage staff accounts and permissions</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openModal()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform transition-all duration-300 font-medium"
                    >
                        <UserPlus size={20} />
                        Create Staff Account
                    </motion.button>
                </div>
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 p-6"
            >
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
                />
            </motion.div>

            {/* Staff Table */}
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
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-50">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No staff members found
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((staffMember, index) => (
                                    <motion.tr
                                        key={staffMember._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-purple-50/50 transition-colors duration-200"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{staffMember.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{staffMember.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{staffMember.role}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${staffMember.isEnabled
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {staffMember.isEnabled ? "Enabled" : "Disabled"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleToggleStatus(staffMember._id, staffMember.isEnabled)}
                                                    className={`p-2 rounded-lg transition-colors ${staffMember.isEnabled
                                                        ? "text-orange-600 hover:bg-orange-50"
                                                        : "text-green-600 hover:bg-green-50"
                                                        }`}
                                                    title={staffMember.isEnabled ? "Disable Login" : "Enable Login"}
                                                >
                                                    {staffMember.isEnabled ? <PowerOff size={18} /> : <Power size={18} />}
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => openModal(staffMember)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Staff"
                                                >
                                                    <Pencil size={18} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDelete(staffMember._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Staff"
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-purple-100"
                        >
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 rounded-t-3xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {editStaff ? "Edit Staff" : "Create Staff Account"}
                                        </h2>
                                        <p className="text-purple-100 text-sm mt-1">
                                            {editStaff ? "Update staff information" : "Add a new staff member"}
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

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                {errors.general && (
                                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                        <p className="text-red-600 text-sm">{errors.general}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-12 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-12 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password {editStaff && "(leave empty to keep current)"}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-4 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                            placeholder={editStaff ? "Enter new password (optional)" : "Enter password"}
                                        />
                                    </div>
                                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        {editStaff ? "Update Staff" : "Create Staff"}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
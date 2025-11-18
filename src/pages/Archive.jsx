import { useState, useEffect } from "react";
import { axiosClient } from "../api/axiosClient";
import {
  Archive as ArchiveIcon,
  Package,
  Truck,
  Users,
  FileText,
  Trash,
  History,
  User,
  UserRoundCheck,
  Warehouse,
} from "lucide-react";

export default function Archive() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [archivedData, setArchivedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleteEnabled, setIsDeleteEnabled] = useState(false);

  // Fetch archived data based on active tab
  useEffect(() => {
    const fetchArchivedData = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(
          `/api/archive/${activeTab}/archived`
        );
        setArchivedData(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch archived data");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedData();
  }, [activeTab]);

  const handleRestore = async (id) => {
    try {
      await axiosClient.patch(`/api/archive/${activeTab}/${id}/restore`);
      const response = await axiosClient.get(
        `api/archive/${activeTab}/archived`
      );
      setArchivedData(response.data);
      alert("Item restored successfully");
    } catch (err) {
      console.error("Error restoring item:", err);
      alert("Failed to restore item");
    }
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setDeleteConfirmation("");
    setIsDeleteEnabled(false);
  };

  const closeDeleteModal = () => {
    setItemToDelete(null);
    setShowDeleteModal(false);
    setDeleteConfirmation("");
    setIsDeleteEnabled(false);
  };

  const handleDeleteConfirmationChange = (e) => {
    const value = e.target.value;
    setDeleteConfirmation(value);
    setIsDeleteEnabled(value.toLowerCase() === "delete");
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete || !isDeleteEnabled) return;

    try {
      await axiosClient.delete(`/api/${activeTab}/${itemToDelete._id}`);
      const response = await axiosClient.get(
        `/api/archive/${activeTab}/archived`
      );
      setArchivedData(response.data);
      closeDeleteModal();
      alert("Item permanently deleted");
    } catch (err) {
      console.error("Error permanently deleting item:", err);
      alert("Failed to delete item permanently");
    }
  };

  // Tab configuration
  const tabs = [
    { id: "bookings", label: "Bookings", icon: Package },
    { id: "trip-reports", label: "Trip Reports", icon: FileText },
    { id: "clients", label: "Clients", icon: User },
    { id: "branches", label: "Branches", icon: Warehouse },
    { id: "vehicles", label: "Vehicles", icon: Truck },
    { id: "employees", label: "Employees (Drivers/Helpers)", icon: Users },
    { id: "staffs", label: "Staffs", icon: UserRoundCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-2">
            Archive
          </h1>
          <p className="text-gray-600 text-sm">
            Manage archived items and restore if needed
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 p-1 bg-white rounded-lg shadow-sm border border-purple-100 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all duration-200
              ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              }
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArchiveIcon className="w-6 h-6 text-red-500" />
            </div>
            {error}
          </div>
        ) : archivedData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArchiveIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No archived items
            </h3>
            <p className="text-gray-500">
              There are no archived {activeTab} at the moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-purple-50">
                <tr>
                  {getTableHeaders(activeTab).map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-medium text-purple-600 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {archivedData.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-purple-50 transition-colors"
                  >
                    {getTableCells(activeTab, item)}
                    <td className="px-6 py-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleRestore(item._id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                        >
                          <History size={14} />
                          Restore
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning Modal for Permanent Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-opacity-50 backdrop-blur-sm"
            onClick={closeDeleteModal}
          ></div>

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10 border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Permanently Delete Item
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you absolutely sure you want to permanently delete this{" "}
                {activeTab.slice(0, -1)}?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 font-medium">
                  Warning: This will permanently remove all data associated with
                  this item from the database. This action is irreversible.
                </p>
              </div>

              {/* Delete Confirmation Input */}
              <div className="space-y-2">
                <label
                  htmlFor="deleteConfirmation"
                  className="block text-sm font-medium text-gray-700"
                >
                  Type "delete" to confirm:
                </label>
                <input
                  type="text"
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={handleDeleteConfirmationChange}
                  placeholder="Type 'delete' here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  This extra step ensures you really want to permanently delete
                  this data.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-150 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={!isDeleteEnabled}
                className={`
                  px-4 py-2 rounded-lg transition duration-150 font-medium
                  ${
                    isDeleteEnabled
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to build a readable address string (works for Client and Branch docs)
function formatAddress(item) {
  // prefer virtual formattedAddress or fullAddress if present
  if (item.formattedAddress) return item.formattedAddress;
  if (item.address?.fullAddress) return item.address.fullAddress;

  const parts = [
    item.address?.houseNumber,
    item.address?.street,
    item.address?.barangay,
    item.address?.city,
    item.address?.province,
    item.address?.region,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "N/A";
}

// Helper function to get table headers based on active tab
function getTableHeaders(tab) {
  switch (tab) {
    case "bookings":
      return [
        "Reservation ID",
        "Reservation Date",
        "Vehicle Type",
        "Destination",
      ];
    case "trip-reports":
      return [
        "Receipt Number",
        "Document Type",
        "File Name",
        "Uploaded By",
        "Notes",
      ];
    case "clients":
      return ["Client Name", "Address", "Date Added"];
    case "branches":
      return ["Branch Name", "Address", "Contact", "Date Added"];
    case "vehicles":
      return ["Vehicle ID", "Type", "Plate Number", "Status"];
    case "employees":
      return ["Employee ID", "Name", "Role", "Status"];
    case "staffs":
      return ["Name", "Email", "Role"];
    default:
      return [];
  }
}

// Helper function to get table cells based on active tab
function getTableCells(tab, item) {
  switch (tab) {
    case "bookings":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.reservationId}
          </td>
          <td className="px-6 py-4 text-gray-600">
            {new Date(item.createdAt).toLocaleDateString()}
          </td>
          <td className="px-6 py-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              {item.vehicleType === "Truck" ? 6 : 4}-Wheeler
            </span>
          </td>
          <td className="px-6 py-4 text-gray-600">{item.destinationAddress}</td>
        </>
      );
    case "clients":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.clientName}
          </td>
          <td className="px-6 py-4 text-gray-600">{formatAddress(item)}</td>
          <td className="px-6 py-4 text-gray-600">
            {new Date(item.createdAt).toLocaleDateString()}
          </td>
        </>
      );
    case "branches":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.branchName}
          </td>
          <td className="px-6 py-4 text-gray-600">{formatAddress(item)}</td>
          <td className="px-6 py-4 text-gray-600">
            <div className="text-sm text-gray-900 font-medium">
              {item.contactPerson || "N/A"}
            </div>
            <div className="text-sm text-gray-600">
              {item.contactNumber || "N/A"}
            </div>
            <div className="text-sm text-indigo-600">{item.email || "N/A"}</div>
          </td>
          <td className="px-6 py-4 text-gray-600">
            {new Date(item.createdAt).toLocaleDateString()}
          </td>
        </>
      );
    case "trip-reports":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.receiptNumber || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">
            {item.documentType || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">{item.fileName || "N/A"}</td>
          <td className="px-6 py-4 text-gray-600">
            {item.uploadedBy || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">{item.notes || "N/A"}</td>
        </>
      );
    case "vehicles":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.vehicleId || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">
            {item.vehicleType || item.type || "N/A"}
          </td>
          <td className="px-6 py-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              {item.plateNumber || "N/A"}
            </span>
          </td>
          <td className="px-6 py-4">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                item.status === "Active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {item.status || "N/A"}
            </span>
          </td>
        </>
      );
    case "employees":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.employeeId || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">
            {item.fullName || item.name || "N/A"}
          </td>
          <td className="px-6 py-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              {item.role || "N/A"}
            </span>
          </td>
          <td className="px-6 py-4">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                item.status === "Active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {item.status || "N/A"}
            </span>
          </td>
        </>
      );
    case "staffs":
      return (
        <>
          <td className="px-6 py-4 font-medium text-gray-900">
            {item.name || "N/A"}
          </td>
          <td className="px-6 py-4 text-gray-600">{item.email || "N/A"}</td>
          <td className="px-6 py-4 text-gray-600">{item.role || "N/A"}</td>
        </>
      );
    default:
      return (
        <td colSpan="100%" className="px-6 py-4 text-center text-gray-500">
          No data available
        </td>
      );
  }
}

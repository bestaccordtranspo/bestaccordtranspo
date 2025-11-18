import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  File,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Paperclip,
  CloudUpload,
} from "lucide-react";

export default function TripReport() {
  const [tripReports, setTripReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  //VITE API base URL
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const itemsPerPage = 10;

  // Search and filter states
  const [generalSearch, setGeneralSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("All");
  const [uploadedByFilter, setUploadedByFilter] = useState("All");

  // Upload form states
  const [uploadForm, setUploadForm] = useState({
    receiptNumber: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Unique filter values
  const [uniqueDocumentTypes, setUniqueDocumentTypes] = useState(["All"]);
  const [uniqueUploadedBy, setUniqueUploadedBy] = useState(["All"]);

  // Enhanced API call function with better error handling
  const makeAPICall = async (url, options = {}) => {
    try {
      console.log("Making API call to:", url);
      console.log("Options:", options);

      const response = await fetch(url, options);

      // Log response details
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response text:", errorText);

        // Try to parse as JSON first, fallback to text
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status} Error` };
        }

        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      // Check content type
      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("Response data:", data);
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server returned non-JSON response. Please check server configuration."
        );
      }
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  };

  // Fetch trip reports
  const fetchTripReports = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(documentTypeFilter !== "All" && {
          documentType: documentTypeFilter,
        }),
        ...(uploadedByFilter !== "All" && { uploadedBy: uploadedByFilter }),
        ...(generalSearch && { search: generalSearch }),
      });

      const data = await makeAPICall(`${baseURL}/api/trip-reports?${params}`);

      setTripReports(data.tripReports || []);
      setPagination(data.pagination || {});

      // Extract unique values for filters
      if (data.tripReports && data.tripReports.length > 0) {
        const docTypes = [
          "All",
          ...new Set(data.tripReports.map((report) => report.documentType)),
        ];
        const uploaders = [
          "All",
          ...new Set(data.tripReports.map((report) => report.uploadedBy)),
        ];
        setUniqueDocumentTypes(docTypes);
        setUniqueUploadedBy(uploaders);
      }
    } catch (err) {
      console.error("Error fetching trip reports:", err);
      setError(`Failed to load trip reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  // Handle drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    processFile(file);
  };

  // Process selected file with enhanced validation
  const processFile = (file) => {
    if (!file) return;

    console.log("Processing file:", file);

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be less than 20MB");
      return;
    }

    // Enhanced file type validation
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "text/plain",
    ];

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".jpg",
      ".jpeg",
      ".png",
      ".txt",
    ];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (
      !allowedMimeTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      setError(
        "Invalid file type. Only PDF, DOC, DOCX, Excel, JPG, PNG, and TXT files are allowed."
      );
      return;
    }

    // Additional file name validation
    if (file.name.length > 255) {
      setError("File name is too long. Please use a shorter file name.");
      return;
    }

    setSelectedFile(file);
    setError("");
    console.log(
      "File processed successfully:",
      file.name,
      file.type,
      file.size
    );
  };

  // Enhanced upload handler with better error handling
  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    if (!uploadForm.receiptNumber.trim()) {
      setError("Receipt number is required");
      return;
    }

    // Validate receipt number format
    if (uploadForm.receiptNumber.trim().length < 3) {
      setError("Receipt number must be at least 3 characters long");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Create and validate FormData
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("receiptNumber", uploadForm.receiptNumber.trim());
      formData.append("notes", uploadForm.notes.trim());
      formData.append("uploadedBy", "Admin");

      // Log FormData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Make the upload request with enhanced error handling
      const data = await makeAPICall(`${baseURL}/api/trip-reports`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header for FormData - let browser handle it
      });

      console.log("Upload successful:", data);
      setSuccess("Trip report uploaded successfully!");
      setShowUploadModal(false);
      resetUploadForm();
      fetchTripReports(currentPage);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Error uploading trip report:", err);

      // Provide more specific error messages
      let errorMessage = err.message;

      if (errorMessage.includes("Receipt number already exists")) {
        errorMessage =
          "A document with this receipt number already exists. Please use a different receipt number.";
      } else if (errorMessage.includes("File too large")) {
        errorMessage =
          "File is too large. Please select a file smaller than 20MB.";
      } else if (errorMessage.includes("Invalid file type")) {
        errorMessage =
          "Invalid file type. Please select a PDF, DOC, DOCX, Excel, JPG, PNG, or TXT file.";
      } else if (errorMessage.includes("Server returned non-JSON response")) {
        errorMessage =
          "Server configuration error. Please contact the administrator.";
      } else if (errorMessage.includes("Failed to fetch")) {
        errorMessage =
          "Cannot connect to server. Please check if the server is running and try again.";
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setUploadForm({
      receiptNumber: "",
      notes: "",
    });
    setSelectedFile(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  //Archive handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this document?"))
      return;
    setError("");
    try {
      const response = await fetch(
        `${baseURL}/api/trip-reports/${id}/archive`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          // No body needed since the archive route doesn't expect any data
        }
      );

      if (!response.ok) {
        throw new Error("Failed to archive document");
      }

      alert("Document archived successfully");
      fetchTripReports();
    } catch (err) {
      console.error("Error archiving document:", err);
      alert("Failed to archive document");
    }
  };

  // Handle download with enhanced error handling
  const handleDownload = async (id, fileName) => {
    try {
      const response = await fetch(
        `${baseURL}/api/trip-reports/download/${id}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError(`Failed to download file: ${err.message}`);
    }
  };

  // Handle view/preview with enhanced error handling
  const handleView = async (id) => {
    try {
      const url = `${baseURL}/api/trip-reports/view/${id}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error viewing file:", err);
      setError(`Failed to view file: ${err.message}`);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get document type badge color
  const getDocumentTypeBadge = (type) => {
    const colors = {
      PDF: "bg-purple-100 text-purple-800",
      DOC: "bg-indigo-100 text-indigo-800",
      DOCX: "bg-indigo-100 text-indigo-800",
      Excel: "bg-violet-100 text-violet-800",
      JPG: "bg-fuchsia-100 text-fuchsia-800",
      JPEG: "bg-fuchsia-100 text-fuchsia-800",
      PNG: "bg-fuchsia-100 text-fuchsia-800",
      TXT: "bg-purple-100 text-purple-800",
      Other: "bg-purple-100 text-purple-800",
    };
    return colors[type] || colors["Other"];
  };

  // Get file type icon
  const getFileTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "excel":
        return "📊";
      case "jpg":
      case "jpeg":
      case "png":
        return "🖼️";
      default:
        return "📁";
    }
  };

  // Effects
  useEffect(() => {
    fetchTripReports(1);
    setCurrentPage(1);
  }, [documentTypeFilter, uploadedByFilter, generalSearch]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 8000); // Increased timeout for better UX
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Test server connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(
          `${baseURL}/api/trip-reports/stats/overview`
        );
        if (!response.ok) {
          console.warn("Server connection test failed:", response.status);
        } else {
          console.log("Server connection successful");
        }
      } catch (err) {
        console.warn("Server connection test failed:", err.message);
        setError(
          "Cannot connect to server. Please ensure the server is running on port 5000."
        );
      }
    };

    testConnection();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent">
            Billing
          </h1>
          <p className="text-gray-600 text-sm">
            Manage and view uploaded trip documents and receipts
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <div>
            <div className="font-medium">Upload Error</div>
            <div className="text-sm">{error}</div>
            <div className="text-xs mt-1 text-red-600">
              If this error persists, please check server logs or contact
              support.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search receipts, files..."
            value={generalSearch}
            onChange={(e) => setGeneralSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
        </div>

        <select
          value={documentTypeFilter}
          onChange={(e) => setDocumentTypeFilter(e.target.value)}
          className="px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          {uniqueDocumentTypes.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "All Types" : type}
            </option>
          ))}
        </select>

        <select
          value={uploadedByFilter}
          onChange={(e) => setUploadedByFilter(e.target.value)}
          className="px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          {uniqueUploadedBy.map((uploader) => (
            <option key={uploader} value={uploader}>
              {uploader === "All" ? "All Uploaders" : uploader}
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FileText className="w-4 h-4 text-purple-600" />
          <span>{pagination.totalItems || 0} total documents</span>
        </div>
      </div>

      {/* Trip Reports Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading trip reports...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    Receipt Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    File Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-900 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-purple-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-purple-100">
                {tripReports.map((report, index) => {
                  const displayNumber =
                    (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr
                      key={report._id}
                      className="hover:bg-purple-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-purple-600">
                          {report.receiptNumber}
                        </div>
                        {report.tripNumber && (
                          <div className="text-xs text-gray-500">
                            Trip: {report.tripNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDocumentTypeBadge(
                            report.documentType
                          )}`}
                        >
                          {report.documentType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-900 max-w-xs truncate"
                          title={report.originalFileName}
                        >
                          {report.originalFileName}
                        </div>
                        {report.notes && (
                          <div
                            className="text-xs text-gray-500 max-w-xs truncate"
                            title={report.notes}
                          >
                            Notes: {report.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(report.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {report.uploadedBy}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(report.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleView(report._id)}
                          className="text-purple-600 hover:text-purple-800 px-3 py-1 rounded hover:bg-purple-50 inline-flex items-center gap-1 transition transform hover:scale-105"
                        >
                          <Eye />
                        </button>
                        <button
                          onClick={() =>
                            handleDownload(report._id, report.originalFileName)
                          }
                          className="text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded hover:bg-indigo-50 inline-flex items-center gap-1 transition transform hover:scale-105"
                        >
                          <Download />
                        </button>
                        <button
                          onClick={() => handleDelete(report._id)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 inline-flex items-center gap-1 transition transform hover:scale-105"
                        >
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {tripReports.length === 0 && !loading && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No trip reports found
                </h3>
                <p className="text-gray-500">
                  {generalSearch ||
                  documentTypeFilter !== "All" ||
                  uploadedByFilter !== "All"
                    ? "No documents match your current filters."
                    : "Upload your first trip report to get started."}
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-purple-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => {
                    setCurrentPage(currentPage - 1);
                    fetchTripReports(currentPage - 1);
                  }}
                  disabled={!pagination.hasPrev}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.hasPrev
                      ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                      : "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    fetchTripReports(currentPage + 1);
                  }}
                  disabled={!pagination.hasNext}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pagination.hasNext
                      ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                      : "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page{" "}
                    <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{pagination.totalPages}</span>{" "}
                    pages ({pagination.totalItems} total documents)
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => {
                        setCurrentPage(currentPage - 1);
                        fetchTripReports(currentPage - 1);
                      }}
                      disabled={!pagination.hasPrev}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                        pagination.hasPrev
                          ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                          : "border-gray-200 text-gray-300 bg-gray-100 cursor-not-allowed"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage(currentPage + 1);
                        fetchTripReports(currentPage + 1);
                      }}
                      disabled={!pagination.hasNext}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                        pagination.hasNext
                          ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                          : "border-gray-200 text-gray-300 bg-gray-100 cursor-not-allowed"
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div
              className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <form onSubmit={handleUpload}>
                {/* Modal Header */}
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 bg-purple-500 rounded-lg"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: 0.2,
                          duration: 0.4,
                          type: "spring",
                        }}
                      >
                        <CloudUpload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Upload Trip Report
                        </h3>
                        <p className="text-purple-100 text-sm">
                          Add a new document to your trip reports
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        resetUploadForm();
                        setError("");
                      }}
                      className="text-purple-100 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div
                  className="px-6 py-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <div className="space-y-6">
                    {/* File Upload Section */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Document File
                      </label>

                      {/* Upload Area */}
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                          isDragOver
                            ? "border-purple-400 bg-purple-50 scale-105"
                            : selectedFile
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-purple-300 hover:border-purple-400 bg-purple-50/30 hover:scale-102"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        {selectedFile ? (
                          // File Selected State
                          <div
                            className="space-y-4"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, type: "spring" }}
                          >
                            <div className="flex items-center justify-center">
                              <div
                                className="p-3 bg-emerald-100 rounded-full"
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5 }}
                              >
                                <Paperclip className="w-8 h-8 text-emerald-600" />
                              </div>
                            </div>
                            <div>
                              <p className="text-lg font-medium text-gray-900">
                                File Selected
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {getFileTypeIcon(selectedFile.type)}{" "}
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </button>
                          </div>
                        ) : (
                          // Default Upload State
                          <div className="space-y-4">
                            <div className="flex items-center justify-center">
                              <div
                                className={`p-4 rounded-full transition-all duration-300 ${
                                  isDragOver
                                    ? "bg-purple-100"
                                    : "bg-purple-100/50"
                                }`}
                                animate={
                                  isDragOver
                                    ? {
                                        y: [-5, 5, -5],
                                        transition: {
                                          repeat: Infinity,
                                          duration: 1,
                                        },
                                      }
                                    : {}
                                }
                              >
                                <CloudUpload
                                  className={`w-12 h-12 transition-colors duration-300 ${
                                    isDragOver
                                      ? "text-purple-600"
                                      : "text-purple-400"
                                  }`}
                                />
                              </div>
                            </div>
                            <div>
                              <p className="text-lg font-medium text-gray-900">
                                {isDragOver
                                  ? "Drop your file here"
                                  : "Upload your document"}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                Drag and drop your file here, or{" "}
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-purple-600 hover:text-purple-700 font-medium underline"
                                >
                                  browse files
                                </button>
                              </p>
                            </div>
                            <div
                              className="flex items-center justify-center space-x-4 text-xs text-gray-500"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4, duration: 0.3 }}
                            >
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                                PDF
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full mr-1"></span>
                                DOC/DOCX
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-violet-400 rounded-full mr-1"></span>
                                Excel
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-fuchsia-400 rounded-full mr-1"></span>
                                Images
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Maximum file size: 20MB
                            </p>
                          </div>
                        )}

                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                        />
                      </div>
                    </div>

                    {/* Receipt Number - Full Width */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        required
                        value={uploadForm.receiptNumber}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            receiptNumber: e.target.value,
                          })
                        }
                        placeholder="e.g., RCP001234"
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={uploadForm.notes}
                        onChange={(e) =>
                          setUploadForm({
                            ...uploadForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Add any notes about this document..."
                        className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                      />
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center"
                        initial={{ scale: 0.95, opacity: 0, x: -20 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, type: "spring" }}
                      >
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:space-x-reverse sm:space-x-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <button
                    type="submit"
                    disabled={
                      uploading ||
                      !selectedFile ||
                      !uploadForm.receiptNumber.trim()
                    }
                    className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-base font-medium text-white hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                      setError("");
                    }}
                    className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-lg border border-purple-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

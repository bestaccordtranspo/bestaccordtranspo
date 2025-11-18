import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Trash2, Plus, X, MapPin, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosClient } from "../api/axiosClient";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

function Client() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search states (removed branch-specific filter)
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [generalSearch, setGeneralSearch] = useState("");

  // Unique filter values
  const [uniqueNames, setUniqueNames] = useState([]);
  const [uniqueCities, setUniqueCities] = useState([]);
  const [uniqueDates, setUniqueDates] = useState([]);

  const [formData, setFormData] = useState({
    clientName: "",
    houseNumber: "",
    street: "",
    location: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (formData.region === "130000000") {
      setFormData((prev) => ({ ...prev, province: "Metro Manila" }));
    }
  }, [formData.region]);

  // Address dropdown states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Map states
  const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]); // Default to Manila
  const [markerPosition, setMarkerPosition] = useState(null);
  const [addressSearch, setAddressSearch] = useState("");
  const mapRef = useRef(null);
  const markerRef = useRef(null);

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
          const districtsRes = await axios.get(
            "https://psgc.gitlab.io/api/regions/130000000/districts/"
          );
          const districts = districtsRes.data;
          let allProvinces = [];
          for (const district of districts) {
            try {
              const provRes = await axios.get(
                `https://psgc.gitlab.io/api/districts/${district.code}/provinces/`
              );
              allProvinces = allProvinces.concat(provRes.data);
            } catch (err) {
              if (err.response && err.response.status === 404) {
                continue;
              } else {
                console.error(
                  `Error fetching provinces for district ${district.code}`,
                  err
                );
              }
            }
          }
          setProvinces(allProvinces);
        } else {
          const res = await axios.get(
            `https://psgc.gitlab.io/api/regions/${formData.region}/provinces/`
          );
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
          const districtsRes = await axios.get(
            "https://psgc.gitlab.io/api/regions/130000000/districts/"
          );
          const districts = districtsRes.data;
          let allCities = [];
          for (const district of districts) {
            let districtHasProvinces = true;
            let provinces = [];
            try {
              const provRes = await axios.get(
                `https://psgc.gitlab.io/api/districts/${district.code}/provinces/`
              );
              provinces = provRes.data;
            } catch (err) {
              if (err.response && err.response.status === 404) {
                districtHasProvinces = false;
              } else {
                console.error(
                  `Error fetching provinces for district ${district.code}`,
                  err
                );
              }
            }
            if (districtHasProvinces && provinces.length > 0) {
              for (const province of provinces) {
                try {
                  const cityRes = await axios.get(
                    `https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities/`
                  );
                  allCities = allCities.concat(cityRes.data);
                } catch (err) {
                  if (err.response && err.response.status === 404) {
                    continue;
                  } else {
                    console.error(
                      `Error fetching cities for province ${province.code}`,
                      err
                    );
                  }
                }
              }
            } else {
              try {
                const cityRes = await axios.get(
                  `https://psgc.gitlab.io/api/districts/${district.code}/cities-municipalities/`
                );
                allCities = allCities.concat(cityRes.data);
              } catch (err) {
                if (err.response && err.response.status === 404) {
                  continue;
                } else {
                  console.error(
                    `Error fetching cities for district ${district.code}`,
                    err
                  );
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
        const res = await axios.get(
          `https://psgc.gitlab.io/api/provinces/${formData.province}/cities-municipalities/`
        );
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
        const res = await axios.get(
          `https://psgc.gitlab.io/api/cities-municipalities/${formData.city}/barangays/`
        );
        setBarangays(res.data);
      } catch (err) {
        console.error("Failed to fetch barangays", err);
      }
    };
    fetchBarangays();
  }, [formData.city]);

  const containerRef = useRef(null);

  const fetchClients = async () => {
    try {
      const res = await axiosClient.get("/api/clients");
      const activeClients = res.data.filter((client) => !client.isArchived);
      setClients(activeClients);
      setFilteredClients(activeClients);

      setUniqueNames([...new Set(activeClients.map((c) => c.clientName))]);

      const cities = activeClients.map((c) => c.address?.city).filter(Boolean);
      setUniqueCities([...new Set(cities)].sort());

      setUniqueDates([
        ...new Set(
          activeClients.map((c) => new Date(c.createdAt).toLocaleDateString())
        ),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filter function — removed branch-based filtering
  useEffect(() => {
    let results = clients;

    if (searchName) {
      results = results.filter((client) => client.clientName === searchName);
    }
    if (searchCity) {
      results = results.filter((client) => client.address?.city === searchCity);
    }
    if (searchDate) {
      results = results.filter(
        (client) =>
          new Date(client.createdAt).toLocaleDateString() === searchDate
      );
    }
    if (generalSearch) {
      results = results.filter(
        (client) =>
          client.clientName
            ?.toLowerCase()
            .includes(generalSearch.toLowerCase()) ||
          client.address?.city
            ?.toLowerCase()
            .includes(generalSearch.toLowerCase()) ||
          new Date(client.createdAt)
            .toLocaleDateString()
            .includes(generalSearch)
      );
    }

    setFilteredClients(results);
    setCurrentPage(1);
  }, [searchName, searchCity, searchDate, generalSearch, clients]);

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Modal handlers — removed clientBranch usage
  const openModal = (client = null) => {
    if (client) {
      setEditClient(client);
      const lat = client.address?.latitude || null;
      const lng = client.address?.longitude || null;
      setFormData({
        clientName: client.clientName || "",
        houseNumber: client.address?.houseNumber || "",
        street: client.address?.street || "",
        location: client.location || "",
        region: client.address?.region || "",
        province: client.address?.province || "",
        city: client.address?.city || "",
        barangay: client.address?.barangay || "",
        latitude: lat,
        longitude: lng,
      });
      if (lat && lng) {
        setMapCenter([lat, lng]);
        setMarkerPosition([lat, lng]);
      } else {
        setMapCenter([14.5995, 120.9842]);
        setMarkerPosition(null);
      }
    } else {
      setEditClient(null);
      setFormData({
        clientName: "",
        houseNumber: "",
        street: "",
        location: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        latitude: null,
        longitude: null,
      });
      setMapCenter([14.5995, 120.9842]);
      setMarkerPosition(null);
    }
    setAddressSearch("");
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // Initialize map when modal opens
  useEffect(() => {
    if (!showModal) return;

    // Wait for modal animation to complete
    const timer = setTimeout(() => {
      const mapElement = document.getElementById("location-map");
      if (!mapElement || mapRef.current) return;

      // Load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initializeMap;
        document.body.appendChild(script);
      } else {
        initializeMap();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [showModal, mapCenter]);

  const initializeMap = () => {
    const mapElement = document.getElementById("location-map");
    if (!mapElement || mapRef.current) return;

    const map = window.L.map("location-map").setView(mapCenter, 13);
    mapRef.current = map;

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Add marker if position exists
    if (markerPosition) {
      const marker = window.L.marker(markerPosition, { draggable: true }).addTo(
        map
      );
      markerRef.current = marker;

      marker.on("dragend", function (e) {
        const pos = e.target.getLatLng();
        setMarkerPosition([pos.lat, pos.lng]);
        setFormData((prev) => ({
          ...prev,
          latitude: pos.lat,
          longitude: pos.lng,
        }));
      });
    }

    // Add click event to place/move marker
    map.on("click", function (e) {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = window.L.marker([lat, lng], { draggable: true }).addTo(
          map
        );
        markerRef.current = marker;

        marker.on("dragend", function (e) {
          const pos = e.target.getLatLng();
          setMarkerPosition([pos.lat, pos.lng]);
          setFormData((prev) => ({
            ...prev,
            latitude: pos.lat,
            longitude: pos.lng,
          }));
        });
      }

      setMarkerPosition([lat, lng]);
      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
    });
  };

  // Search address function
  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) return;

    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: addressSearch + ", Philippines",
            format: "json",
            limit: 1,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];

        setMapCenter(newCenter);
        setMarkerPosition(newCenter);
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        }));

        // Update map view
        if (mapRef.current) {
          mapRef.current.setView(newCenter, 15);

          if (markerRef.current) {
            markerRef.current.setLatLng(newCenter);
          } else {
            const marker = window.L.marker(newCenter, {
              draggable: true,
            }).addTo(mapRef.current);
            markerRef.current = marker;

            marker.on("dragend", function (e) {
              const pos = e.target.getLatLng();
              setMarkerPosition([pos.lat, pos.lng]);
              setFormData((prev) => ({
                ...prev,
                latitude: pos.lat,
                longitude: pos.lng,
              }));
            });
          }
        }
      } else {
        alert("Address not found. Please try a different search.");
      }
    } catch (err) {
      console.error("Error searching address:", err);
      alert("Failed to search address. Please try again.");
    }
  };

  // Cleanup map on modal close
  useEffect(() => {
    if (!showModal && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [showModal]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "region") {
      setFormData({
        ...formData,
        region: value,
        province: "",
        city: "",
        barangay: "",
      });
    } else if (name === "province") {
      setFormData({ ...formData, province: value, city: "", barangay: "" });
    } else if (name === "city") {
      setFormData({ ...formData, city: value, barangay: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const getName = (list, code) => {
        const found = list.find((item) => item.code === code);
        return found ? found.name : code;
      };
      const address = {
        houseNumber: formData.houseNumber,
        street: formData.street,
        region: getName(regions, formData.region),
        province:
          formData.region === "130000000"
            ? "Metro Manila"
            : getName(provinces, formData.province),
        city: getName(cities, formData.city),
        barangay: getName(barangays, formData.barangay),
        latitude: formData.latitude,
        longitude: formData.longitude,
      };
      const payload = {
        clientName: formData.clientName,
        address,
      };
      if (editClient) {
        await axiosClient.put(`/api/clients/${editClient._id}`, payload);
        alert("Client updated successfully!");
      } else {
        await axiosClient.post("/api/clients", payload);
        alert("Client created successfully!");
      }
      closeModal();
      fetchClients();
    } catch (err) {
      console.error(err);
      alert("Error adding/updating client");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this client?"))
      return;

    try {
      await axiosClient.patch(`/api/clients/${id}/archive`, {
        isArchived: true,
      });
      alert("Client archived successfully");
      fetchClients();
    } catch (err) {
      console.error("Error archiving client:", err);
      alert("Error archiving client. Please try again.");
    }
  };

  const viewClient = (client) => {
    navigate(`/dashboard/client/${client._id}`);
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
              Clients
            </h1>
            <p className="text-sm text-gray-600">
              Manage your client relationships and information
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl inline-flex items-center gap-2 transform transition-all duration-300 font-medium"
          >
            <Plus size={20} />
            Add Client
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Clients</option>
            {uniqueNames.map((name, i) => (
              <option key={i} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Locations</option>
            {uniqueCities.map((city, i) => (
              <option key={i} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white/50 text-sm"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((date, i) => (
              <option key={i} value={date}>
                {date}
              </option>
            ))}
          </select>

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
                  Client Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Address
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Date Added
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {paginatedClients.map((client, index) => (
                <motion.tr
                  key={client._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-purple-50/50 transition-colors duration-200"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {client.clientName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {[
                      client.address?.houseNumber,
                      client.address?.street,
                      client.address?.barangay,
                      client.address?.city,
                      client.address?.province,
                      client.address?.region,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => viewClient(client)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(client)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(client._id)}
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-purple-100"
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 rounded-t-3xl z-10 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editClient ? "Edit Client" : "Add Client"}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      Enter client details and address information
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

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-8 space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Client Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Name *
                        </label>
                        <input
                          type="text"
                          name="clientName"
                          value={formData.clientName}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Address Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            House/Building Number
                          </label>
                          <input
                            type="text"
                            name="houseNumber"
                            value={formData.houseNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Street
                          </label>
                          <input
                            type="text"
                            name="street"
                            value={formData.street}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Region *
                        </label>
                        <select
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        >
                          <option value="">Select Region</option>
                          {regions.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {formData.region !== "130000000" ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Province *
                          </label>
                          <select
                            name="province"
                            value={formData.province}
                            onChange={handleChange}
                            required={!!formData.region}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                            disabled={!formData.region}
                          >
                            <option value="">Select Province</option>
                            {provinces.map((p) => (
                              <option key={p.code} value={p.code}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Province
                          </label>
                          <div className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl bg-gray-50 text-gray-700">
                            Metro Manila (National Capital Region)
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City/Municipality *
                        </label>
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          required={
                            formData.region === "130000000" ||
                            !!formData.province
                          }
                          className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          disabled={
                            formData.region !== "130000000" &&
                            !formData.province
                          }
                        >
                          <option value="">Select City/Municipality</option>
                          {cities.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Barangay *
                        </label>
                        <select
                          name="barangay"
                          value={formData.barangay}
                          onChange={handleChange}
                          required={!!formData.city}
                          className="w-full px-4 py-2.5 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          disabled={!formData.city}
                        >
                          <option value="">Select Barangay</option>
                          {barangays.map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-2xl border border-violet-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="text-purple-600" size={20} />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pin Your Location
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Search your address or click on the map to pin your exact
                      location. You can also drag the marker to adjust.
                    </p>

                    <div className="mb-4 flex gap-2">
                      <input
                        type="text"
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddressSearch())
                        }
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

                    <div
                      id="location-map"
                      className="w-full h-96 rounded-xl shadow-lg border-2 border-violet-200"
                    ></div>

                    {markerPosition && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-violet-200">
                        <p className="text-xs text-gray-600">
                          <strong>Coordinates:</strong>{" "}
                          {markerPosition[0].toFixed(6)},{" "}
                          {markerPosition[1].toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </form>

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

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                  >
                    {editClient ? "Update Client" : "Add Client"}
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

export default Client;

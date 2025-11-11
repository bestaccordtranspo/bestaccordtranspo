import { useState, useEffect, useRef } from "react";
import { Plus, X, MapPin, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { axiosClient } from "../api/axiosClient";
import axios from "axios";

export default function Branch() {
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  const [formData, setFormData] = useState({
    clientId: "",
    branchName: "",
    houseNumber: "",
    street: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    latitude: null,
    longitude: null,
    contactPerson: "",
    contactNumber: "",
    email: ""
  });

  // address dropdowns
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // map
  const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [addressSearch, setAddressSearch] = useState("");
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axiosClient.get("/api/clients");
        setClients(res.data.filter(c => !c.isArchived));
      } catch (err) {
        console.error(err);
      }
    };
    fetchClients();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axiosClient.get("/api/branches");
      setBranches(res.data.filter(b => !b.isArchived));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // load regions for address selection
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

  // other address dependent fetches (provinces/cities/barangays) omitted for brevity — reuse logic from Client.jsx if needed
  // map initialization logic similar to Client.jsx
  // address search using nominatim similar to Client.jsx

  const openModal = (branch = null) => {
    if (branch) {
      setEditBranch(branch);
      setFormData({
        clientId: branch.client?._id || branch.client,
        branchName: branch.branchName || "",
        houseNumber: branch.address?.houseNumber || "",
        street: branch.address?.street || "",
        region: branch.address?.region || "",
        province: branch.address?.province || "",
        city: branch.address?.city || "",
        barangay: branch.address?.barangay || "",
        latitude: branch.address?.latitude || null,
        longitude: branch.address?.longitude || null,
        contactPerson: branch.contactPerson || "",
        contactNumber: branch.contactNumber || "",
        email: branch.email || ""
      });
      if (branch.address?.latitude && branch.address?.longitude) {
        setMarkerPosition([branch.address.latitude, branch.address.longitude]);
        setMapCenter([branch.address.latitude, branch.address.longitude]);
      }
    } else {
      setEditBranch(null);
      setFormData({
        clientId: "",
        branchName: "",
        houseNumber: "",
        street: "",
        region: "",
        province: "",
        city: "",
        barangay: "",
        latitude: null,
        longitude: null,
        contactPerson: "",
        contactNumber: "",
        email: ""
      });
      setMapCenter([14.5995, 120.9842]);
      setMarkerPosition(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) return alert("Select a client first.");
    try {
      const address = {
        houseNumber: formData.houseNumber,
        street: formData.street,
        region: formData.region,
        province: formData.province,
        city: formData.city,
        barangay: formData.barangay,
        latitude: formData.latitude,
        longitude: formData.longitude
      };
      const payload = {
        client: formData.clientId,
        branchName: formData.branchName,
        address,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        email: formData.email
      };
      if (editBranch) {
        await axiosClient.put(`/api/branches/${editBranch._id}`, payload);
        alert("Branch updated");
      } else {
        await axiosClient.post("/api/branches", payload);
        alert("Branch created");
      }
      setShowModal(false);
      fetchBranches();
    } catch (err) {
      console.error(err);
      alert("Error saving branch");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Archive this branch?")) return;
    try {
      await axiosClient.patch(`/api/branches/${id}/archive`, { isArchived: true });
      fetchBranches();
    } catch (err) {
      console.error(err);
      alert("Failed to archive");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl -z-10" />
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold">Branches</h1>
            <p className="text-sm text-gray-600">Manage branches tied to clients</p>
          </div>
          <motion.button onClick={() => openModal()} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl">
            <Plus size={18} /> Add Branch
          </motion.button>
        </div>
      </motion.div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th>No</th>
              <th>Branch Name</th>
              <th>Client</th>
              <th>Address</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b, i) => (
              <tr key={b._id}>
                <td>{i+1}</td>
                <td>{b.branchName}</td>
                <td>{b.client?.clientName || b.client}</td>
                <td>
                  {[b.address?.houseNumber, b.address?.street, b.address?.barangay, b.address?.city, b.address?.province, b.address?.region].filter(Boolean).join(", ")}
                </td>
                <td>{b.contactPerson} {b.contactNumber && `• ${b.contactNumber}`}</td>
                <td className="flex gap-2">
                  <button onClick={() => openModal(b)}><Pencil size={16}/></button>
                  <button onClick={() => handleDelete(b._id)}><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editBranch ? "Edit Branch" : "Add Branch"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2"><X/></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm">Client *</label>
                  <select required value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="w-full border p-2">
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.clientName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm">Branch Name *</label>
                  <input required value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} className="w-full border p-2" />
                </div>

                {/* Address inputs (region/province/city/barangay) - reuse logic as needed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input placeholder="House / Building #" value={formData.houseNumber} onChange={e => setFormData({...formData, houseNumber: e.target.value})} className="border p-2" />
                  <input placeholder="Street" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="border p-2" />
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded">Save</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import express from "express";
import Branch from "../models/Branch.js";
import Client from "../models/Client.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// GET all branches (optionally filtered by clientId)
router.get("/", async (req, res) => {
  try {
    const { clientId } = req.query;
    const query = { isArchived: { $ne: true } };

    if (clientId) {
      console.log("🔍 Filtering branches for client:", clientId);
      // Accept either string id or populated client object
      query.client = clientId;
    }

    const branches = await Branch.find(query)
      .populate("client", "clientName")
      .sort({ createdAt: -1 })
      .lean();

    console.log("📦 Found branches:", branches.length);
    res.json(branches);
  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET single branch,
router.get("/:id", async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate("client");
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json(branch);
  } catch (err) {
    console.error("Error fetching branch:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET branches for a specific client (legacy route kept if used)
router.get("/client/:clientId", async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const branches = await Branch.find({ client: clientId, isArchived: false }).sort({ createdAt: -1 }).lean();
    res.json(branches);
  } catch (err) {
    console.error("Error fetching branches for client:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET branches by address (keep your existing geocoding endpoint)
router.get("/by-address", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ message: "Address parameter is required" });

    const branch = await Branch.findOne({
      $or: [
        { 'address.fullAddress': { $regex: address, $options: 'i' } },
        { branchName: { $regex: address, $options: 'i' } }
      ]
    }).lean();

    if (branch) return res.json(branch);
    res.status(404).json({ message: "Branch not found" });
  } catch (err) {
    console.error("Error finding branch by address:", err);
    res.status(500).json({ message: err.message });
  }
});
// GET bookings for a branch - Address-based search
router.get("/:id/bookings", async (req, res) => {
  try {
    const branchId = req.params.id;
    
    // First, get the branch details to find its address
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Extract address components for searching
    const branchAddress = branch.address?.fullAddress || 
                         [branch.address?.barangay, branch.address?.city, branch.address?.province]
                         .filter(Boolean).join(", ");

    console.log(`🔍 Searching bookings for branch: ${branch.branchName}`);
    console.log(`📍 Branch address: ${branchAddress}`);

    if (!branchAddress) {
      return res.status(400).json({ message: "Branch address not found" });
    }

    // Find bookings where origin or destination addresses match this branch's address
    const bookings = await Booking.find({
      $or: [
        { originAddress: { $regex: branchAddress, $options: 'i' } },
        { 
          'destinationDeliveries.destinationAddress': { 
            $regex: branchAddress, $options: 'i' 
          } 
        }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

    console.log(`📊 Found ${bookings.length} bookings for branch ${branch.branchName}`);
    
    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings for branch:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// POST create branch
router.post("/", async (req, res) => {
  try {
    const { client, branchName, address, contactPerson, contactNumber, email } = req.body;

    if (!client) return res.status(400).json({ message: "Client ID is required" });
    const clientDoc = await Client.findById(client);
    if (!clientDoc) return res.status(400).json({ message: "Client not found" });

    const newBranch = new Branch({ client, branchName, address, contactPerson, contactNumber, email });
    const saved = await newBranch.save();
    const populated = await saved.populate("client");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating branch:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT update branch
router.put("/:id", async (req, res) => {
  try {
    const update = req.body;
    if (update.client) {
      const clientExists = await Client.findById(update.client);
      if (!clientExists) return res.status(400).json({ message: "Client not found" });
    }
    const updatedBranch = await Branch.findByIdAndUpdate(req.params.id, update, { new: true }).populate("client");
    if (!updatedBranch) return res.status(404).json({ message: "Branch not found" });
    res.json(updatedBranch);
  } catch (err) {
    console.error("Error updating branch:", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH archive branch
router.patch("/:id/archive", async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { isArchived: true, updatedAt: new Date() }, { new: true });
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.json({ success: true, message: "Branch archived", branch });
  } catch (err) {
    console.error("Error archiving branch:", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE branch (permanent)
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Branch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Branch not found" });
    res.json({ message: "Branch deleted" });
  } catch (err) {
    console.error("Error deleting branch:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
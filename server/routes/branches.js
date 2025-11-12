import express from "express";
import Branch from "../models/Branch.js";
import Client from "../models/Client.js";

const router = express.Router();

// GET all branches (populates client)
router.get("/", async (req, res) => {
  try {
    const branches = await Branch.find().populate("client").sort({ createdAt: -1 });
    res.json(branches);
  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET single branch
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

// GET branches for a specific client
router.get("/client/:clientId", async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const branches = await Branch.find({ client: clientId, isArchived: false }).sort({ createdAt: -1 });
    res.json(branches);
  } catch (err) {
    console.error("Error fetching branches for client:", err);
    res.status(500).json({ message: err.message });
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
import express from "express";
import Client from "../models/Client.js";
import Booking from "../models/Booking.js";
import Branch from "../models/Branch.js";

const router = express.Router();

// GET all clients
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET all client names (for dropdowns, etc.)
router.get("/names", async (req, res) => {
  try {
    const clients = await Client.find({}, "clientName"); // only return clientName field
    res.json(clients);
  } catch (err) {
    console.error("Error fetching client names:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET client by address (for fetching coordinates) - NEW ENDPOINT
router.get("/by-address", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: 'Address parameter is required' });
    }

    console.log(`🔍 Searching for client with address: "${address}"`);

    // Build a comprehensive address string for each client and compare
    const clients = await Client.find({
      isArchived: false,
      'address.latitude': { $ne: null },
      'address.longitude': { $ne: null }
    });

    // Helper function to build full address string
    const buildFullAddress = (addressObj) => {
      if (!addressObj) return '';
      const parts = [
        addressObj.houseNumber,
        addressObj.street,
        addressObj.barangay,
        addressObj.city,
        addressObj.province
      ].filter(Boolean);
      return parts.join(', ').toLowerCase();
    };

    // Search through all clients for best match
    let bestMatch = null;
    let highestScore = 0;

    const searchTermLower = address.toLowerCase().trim();

    for (const client of clients) {
      const fullAddress = buildFullAddress(client.address);

      // Exact match (highest priority)
      if (fullAddress === searchTermLower) {
        bestMatch = client;
        break;
      }

      // Calculate match score
      let score = 0;

      // Check if search term is contained in full address
      if (fullAddress.includes(searchTermLower)) {
        score += 10;
      }

      // Check individual fields
      const fields = ['street', 'barangay', 'city', 'province'];
      for (const field of fields) {
        if (client.address[field]) {
          const fieldValue = client.address[field].toLowerCase();
          if (fieldValue === searchTermLower) {
            score += 8;
          } else if (fieldValue.includes(searchTermLower)) {
            score += 5;
          } else if (searchTermLower.includes(fieldValue)) {
            score += 3;
          }
        }
      }

      // Keep track of best match
      if (score > highestScore) {
        highestScore = score;
        bestMatch = client;
      }
    }

    if (!bestMatch) {
      console.log(`❌ No client found for address: "${address}"`);
      return res.status(404).json({ message: 'Client not found for this address' });
    }

    console.log(`✅ Found client: ${bestMatch.clientName} (Score: ${highestScore})`);
    console.log(`   Coordinates: [${bestMatch.address.latitude}, ${bestMatch.address.longitude}]`);

    res.json(bestMatch);
  } catch (error) {
    console.error('Error fetching client by address:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET single client
router.get("/:id", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  } catch (err) {
    console.error("Error fetching client:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET bookings for a specific client
router.get("/:id/bookings", async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const bookings = await Booking.find({
      companyName: client.clientName,
      isArchived: false
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error("Error fetching client history:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET branches for a specific client
router.get("/:id/branches", async (req, res) => {
  try {
    const clientId = req.params.id;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const branches = await Branch.find({ client: clientId, isArchived: false }).sort({ createdAt: -1 });
    res.json(branches);
  } catch (err) {
    console.error("Error fetching client branches:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST create client
router.post("/", async (req, res) => {
  try {
    const newClient = new Client(req.body);
    const savedClient = await newClient.save();
    res.status(201).json(savedClient);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT update client
router.put("/:id", async (req, res) => {
  try {
    const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedClient) return res.status(404).json({ message: "Client not found" });
    res.json(updatedClient);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH archive client
router.patch('/:id/archive', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    res.json({
      success: true,
      message: "Client archived successfully",
      client
    });
  } catch (err) {
    console.error('Error archiving client:', err);
    res.status(500).json({
      success: false,
      message: "Error archiving client"
    });
  }
});

// PATCH restore client
router.patch('/:id/restore', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    res.json({
      success: true,
      message: "Client restored successfully",
      client
    });
  } catch (err) {
    console.error('Error restoring client:', err);
    res.status(500).json({
      success: false,
      message: "Error restoring client"
    });
  }
});

// DELETE client
router.delete("/:id", async (req, res) => {
  try {
    const deletedClient = await Client.findByIdAndDelete(req.params.id);
    if (!deletedClient) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
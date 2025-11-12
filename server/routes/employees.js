import express from "express";
import Employee from "../models/Employee.js";
import Counter from "../models/Counter.js";
import Booking from "../models/Booking.js";


const router = express.Router();

// Generate next Employee ID
async function getNextEmployeeID() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { id: "employee" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // If seq is somehow missing, set it to 1
    if (!counter.seq) {
      counter.seq = 1;
      await counter.save();
    }

    const seqNumber = counter.seq.toString().padStart(3, "0");
    return `EMP${seqNumber}`;
  } catch (error) {
    console.error("Error generating employee ID:", error);
    throw error;
  }
}

// GET all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET single employee
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET bookings for a specific employee
router.get("/:id/bookings", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const bookings = await Booking.aggregate([
      {
        $match: {
          employeeAssigned: employee.employeeId,
          isArchived: false
        }
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicleId",
          foreignField: "vehicleId",
          as: "vehicleInfo"
        }
      },
      {
        $unwind: {
          path: "$vehicleInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json(bookings);
  } catch (err) {
    console.error("Error fetching employee bookings:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST create employee
router.post("/", async (req, res) => {
  try {
    // remove empty/null email to avoid inserting email: null
    const payload = { ...req.body };
    if (!payload.email) delete payload.email;

    // Try a few times to avoid employeeId race collisions
    const MAX_ATTEMPTS = 5;
    let savedEmployee = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const newEmployeeId = await getNextEmployeeID();
        if (!newEmployeeId) {
          return res.status(500).json({ message: "Failed to generate Employee ID" });
        }

        const newEmployee = new Employee({
          ...payload,
          employeeId: newEmployeeId
        });

        savedEmployee = await newEmployee.save();
        break; // success
      } catch (innerErr) {
        // If duplicate on employeeId, retry ID generation
        if (innerErr && innerErr.code === 11000 && innerErr.keyPattern && innerErr.keyPattern.employeeId) {
          console.warn(`Employee ID collision on attempt ${attempt + 1}, retrying...`);
          // continue loop to generate a new ID and try again
          continue;
        }
        // For other errors, rethrow to outer catch
        throw innerErr;
      }
    }

    if (!savedEmployee) {
      return res.status(500).json({ message: "Failed to create employee after multiple attempts" });
    }

    res.status(201).json(savedEmployee);
  } catch (err) {
    console.error("Error creating employee:", err);
    // handle duplicate-key explicitly
    if (err.code === 11000) {
      const keyValue = err.keyValue || {};
      const keys = Object.keys(keyValue);
      if (keys.length) {
        return res.status(409).json({ message: `${keys.join(", ")} already exists` });
      }
      return res.status(409).json({ message: "Duplicate entry detected" });
    }
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// PUT update employee
router.put("/:id", async (req, res) => {
  try {
    // Don't allow updating employeeId through PUT request
    const { employeeId, ...updateData } = req.body;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH archive employee
router.patch('/:id/archive', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee archived successfully",
      employee
    });
  } catch (err) {
    console.error('Error archiving employee:', err);
    res.status(500).json({
      success: false,
      message: "Error archiving employee"
    });
  }
});

// PATCH restore employee
router.patch('/:id/restore', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee restored successfully",
      employee
    });
  } catch (err) {
    console.error('Error restoring employee:', err);
    res.status(500).json({
      success: false,
      message: "Error restoring employee"
    });
  }
});

// DELETE employee
router.delete("/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
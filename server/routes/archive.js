import express from 'express';
import Booking from '../models/Booking.js';
import TripReport from '../models/TripReport.js';
import Client from '../models/Client.js';
import Branch from '../models/Branch.js';
import Vehicle from '../models/Vehicle.js';
import Employee from '../models/Employee.js';
import Staff from '../models/Staff.js';

const router = express.Router();

// Helper function to get the correct model
function getModelByType(type) {
    switch (type) {
        case 'bookings':
            return Booking;
        case 'clients':
            return Client;
        case 'Branches':
            return Branch;
        case 'vehicles':
            return Vehicle;
        case 'employees':
            return Employee;
        case 'trip-reports':
            return TripReport;
        case 'staffs':
            return Staff;
        default:
            throw new Error(`Unknown model type: ${type}`);
    }
}

// Generic route to get archived items by type
router.get('/:type/archived', async (req, res) => {
    try {
        const { type } = req.params;
        const Model = getModelByType(type);

        const archivedItems = await Model.find({ isArchived: true });
        res.json(archivedItems);
    } catch (err) {
        console.error(`Error fetching archived ${req.params.type}:`, err);
        res.status(500).json({ message: err.message });
    }
});

// Restore item from archive
router.patch('/:type/:id/restore', async (req, res) => {
    try {
        const { type, id } = req.params;
        const Model = getModelByType(type);

        const item = await Model.findByIdAndUpdate(
            id,
            { isArchived: false },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({ success: true, message: `${type.slice(0, -1)} restored successfully`, item });
    } catch (err) {
        console.error('Error restoring item:', err);
        res.status(500).json({ message: err.message });
    }
});

export default router;
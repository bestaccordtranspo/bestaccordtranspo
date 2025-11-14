import cron from 'node-cron';
import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import Employee from '../models/Employee.js';

// Update vehicle and employee status
async function updateVehicleAndEmployeeStatus(booking, newStatus) {
  try {
    if (booking.vehicleId) {
      await Vehicle.findOneAndUpdate(
        { vehicleId: booking.vehicleId },
        { status: newStatus }
      );
    }

    if (Array.isArray(booking.employeeAssigned) && booking.employeeAssigned.length > 0) {
      await Employee.updateMany(
        { employeeId: { $in: booking.employeeAssigned } },
        { status: newStatus }
      );
    }
  } catch (error) {
    console.error("Error updating statuses:", error);
  }
}

// Run every day at midnight
export function startScheduler() {
  cron.schedule('0 0 * * *', async () => {
    console.log('🕐 Running scheduled booking processor...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const bookingsToActivate = await Booking.find({
        dateNeeded: { $lte: today },
        status: "Pending",
        isArchived: false
      });
      
      console.log(`Found ${bookingsToActivate.length} bookings to activate`);
      
      for (const booking of bookingsToActivate) {
        await updateVehicleAndEmployeeStatus(booking, "On Trip");
        console.log(`✅ Activated booking ${booking.reservationId}`);
      }
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  });
  
  console.log('✅ Scheduler started - will run daily at midnight');
}
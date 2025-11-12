import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    reservationId: { type: String, unique: true },
    tripNumber: { type: String, unique: true },
    
    // Company and shipment info (shared across all stops)
    companyName: { type: String, required: true },
    originAddress: { type: String, required: true },
    
    // Trip configuration
    tripType: {
        type: String,
        enum: ['single', 'multiple'],
        default: 'single'
    },
    numberOfStops: {
        type: Number,
        default: 1
    },
    
    // Store complete product details for each destination - THIS IS NOW THE SINGLE SOURCE OF TRUTH
    destinationDeliveries: [{
        // Destination info
        customerEstablishmentName: { type: String, required: true },
        destinationAddress: { type: String, required: true },
        destinationIndex: { type: Number, required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        grossWeight: { type: Number, required: true },
        unitPerPackage: { type: Number, required: true },
        numberOfPackages: { type: Number, required: true },
        
        // Delivery status
        status: { 
            type: String, 
            enum: ['pending', 'delivered'],
            default: 'pending'
        },
        deliveredAt: { type: Date, default: null },
        deliveredBy: { type: String, default: null },
        proofOfDelivery: { type: String, default: null },
        notes: { type: String, default: null }
    }],
    
    // REMOVED: Legacy fields for backward compatibility
    // productName: { type: String },
    // quantity: { type: Number },
    // grossWeight: { type: Number },
    // unitPerPackage: { type: Number },
    // numberOfPackages: { type: Number },
    // customerEstablishmentName: { type: String },
    // destinationAddress: [{ type: String }],
    deliveryFee: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, 
    
    // Shared fields
    // deliveryFee: { type: Number, required: true, null:true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    
    vehicleId: {
        type: String,
        required: true
    },
    vehicleType: { type: String, required: true },
    plateNumber: { type: String, required: true },
    vehicleHistory: [{
        vehicleId: { type: String, required: true },
        vehicleType: { type: String, required: true },
        plateNumber: { type: String, required: true },
        startedAt: { type: Date, required: true },
        endedAt: { type: Date },
        reason: { type: String },
        status: { type: String, enum: ['active', 'replaced'], default: 'active' }
    }],
    vehicleChangeRequest: {
        requested: { type: Boolean, default: false },
        requestedAt: { type: Date },
        reason: { type: String },
        status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
        approvedAt: { type: Date }
    },

    dateNeeded: { type: Date, required: true },
    timeNeeded: { type: String, required: true },
    employeeAssigned: [{ type: String }],
    roleOfEmployee: [{ type: String }],
    status: {
        type: String,
        enum: ["Pending", "Ready to go", "In Transit", "Delivered", "Completed"],
        default: "Pending"
    },
    isArchived: { type: Boolean, default: false },
    proofOfDelivery: {
        type: String,
        default: null,
        validate: {
            validator: function (v) {
                if (!v) return true;
                const estimatedSizeMB = (v.length * 0.75) / (1024 * 1024);
                return estimatedSizeMB <= 10;
            },
            message: 'Proof of delivery image must be less than 10MB'
        }
    },
    driverLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        lastUpdated: { type: Date, default: null },
        accuracy: { type: Number, default: null }
    }
}, {
    timestamps: true,
    strictQuery: false
});

// REMOVED: No more pre-save middleware needed since we only have one data structure

export default mongoose.model("Booking", bookingSchema);
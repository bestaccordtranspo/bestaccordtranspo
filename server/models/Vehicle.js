import mongoose from "mongoose";

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, unique: true },
    registrationNumber: { type: String, required: true, unique: true },
    manufacturedBy: { type: String, required: true },
    model: { type: String, required: true },
    plateNumber: { type: String, required: true, unique: true },
    vehicleType: { type: String, enum: ["4-Wheeler", "6-Wheeler"], required: true },
    color: { type: String },
    chassisNumber: { type: String },
    engineNumber: { type: String },
    registrationExpiryDate: { type: Date },
    maxWeightCapacity: { type: Number },
    status: {
      type: String,
      enum: ["Available", "Not Available", "On Trip"],
      default: "Available",
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", VehicleSchema);

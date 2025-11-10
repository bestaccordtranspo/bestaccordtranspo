import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  fullName: { type: String, required: true },
  role: { type: String, required: true, enum: ["Driver", "Helper"] },
  employmentType: { type: String, required: true, enum: ["Part-time", "Full-time", "Contractual"] },
  mobileNumber: { type: String, required: true },
  currentAddress: { type: String },
  permanentAddress: { type: String },
  emergencyContactName: { type: String },
  emergencyContactNumber: { type: String },
  dateHired: { type: Date },
  shift: { type: String, enum: ["Morning", "Afternoon", "Night"] },
  status: { type: String, enum: ["Available", "On Trip"], default: "Available" },
  username: { type: String, unique: true, required: true },
  password: { type: String },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);

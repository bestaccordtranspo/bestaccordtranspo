import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    address: {
      houseNumber: { type: String },
      street: { type: String },
      region: { type: String, required: true },
      province: { type: String, required: true },
      city: { type: String, required: true },
      barangay: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      fullAddress: { type: String }
    },
    contactPerson: { type: String },
    contactNumber: { type: String },
    email: { type: String },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual for formatted address
branchSchema.virtual('formattedAddress').get(function() {
  if (!this.address) return '';
  
  const parts = [
    this.address.houseNumber,
    this.address.street,
    this.address.barangay,
    this.address.city,
    this.address.province,
    this.address.region
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Index for better query performance
branchSchema.index({ client: 1 });
branchSchema.index({ isArchived: 1 });

branchSchema.set('toJSON', { virtuals: true });
branchSchema.set('toObject', { virtuals: true });

export default mongoose.model("Branch", branchSchema);
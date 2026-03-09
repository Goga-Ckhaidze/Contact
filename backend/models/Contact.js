import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/* ================= THE FIX =================
  This ensures that there can only be ONE document for a 
  specific sender/receiver pair. If you try to create a duplicate, 
  MongoDB will reject it immediately.
*/
contactSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);
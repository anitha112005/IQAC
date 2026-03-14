import mongoose from "mongoose";

const researchSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    publicationType: {
      type: String,
      enum: ["Journal", "Conference", "Patent", "Book Chapter"],
      required: true
    },
    journalOrConference: { type: String, default: "" },
    publishedOn: { type: Date, required: true },
    accreditationCriteria: { type: String, default: "NAAC-C3" }
  },
  { timestamps: true }
);

export default mongoose.model("Research", researchSchema);

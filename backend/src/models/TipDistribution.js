import mongoose from "mongoose";

const tipDistributionSchema = new mongoose.Schema(
  {
    month: { 
      type: String, 
      required: true // VD: "2026-03" hoặc "Tháng 3"
    },
    periodName: { 
      type: String, 
      required: true // VD: "Kỳ 15/3 - 30/3"
    },
    totalTip: { 
      type: Number, 
      required: true 
    },
    bonusAmount: { 
      type: Number, 
      default: 500000 
    },
    serviceFundPercent: { 
      type: Number, 
      default: 5 // 5%
    },
    totalDays: { 
      type: Number, 
      required: true 
    },
    tipPerDay: { 
      type: Number, 
      required: true 
    },
    // Chi tiết từng người trong kỳ
    details: [
      {
        employeeName: { type: String, required: true },
        department: { type: String, enum: ["FOH", "BOH"], required: true },
        workDays: { type: Number, required: true },
        isTopPerformer: { type: Boolean, default: false },
        baseTip: { type: Number, required: true },
        fundDeduction: { type: Number, required: true },
        finalTip: { type: Number, required: true },
      }
    ]
  },
  { timestamps: true }
);

export const TipDistribution = mongoose.model("TipDistribution", tipDistributionSchema);
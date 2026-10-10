import mongoose from "mongoose";

const tipDistributionSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    periodName: { type: String, required: true },
    totalTip: { type: Number, required: true },
    carryOver: { type: Number, default: 0 }, // TỒN KÌ TRƯỚC
    bonusAmount: { type: Number, default: 500000 },
    serviceFundPercent: { type: Number, default: 5 },
    totalDays: { type: Number, required: true }, // Tổng công THỰC TẾ
    tipPerDay: { type: Number, required: true },
    applyBonus: { type: Boolean, default: true },
    totalPenalty: { type: Number, default: 0 }, // TỔNG TIỀN PHẠT (trừ công × 1 công)
    totalServiceFund: { type: Number, default: 0 }, // TỔNG QUỸ 5% FOH
    details: [
      {
        employeeName: { type: String, required: true },
        department: { type: String, enum: ["FOH", "BOH"], required: true },
        workDays: { type: Number, required: true },
        deductedDays: { type: Number, default: 0 },
        effectiveDays: { type: Number, required: true },
        isTopPerformer: { type: Boolean, default: false },
        baseTip: { type: Number, required: true },
        penaltyAmount: { type: Number, default: 0 }, // TIỀN PHẠT = trừ công × 1 công
        fundDeduction: { type: Number, required: true }, // 5% FOH
        finalTip: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const TipDistribution = mongoose.model("TipDistribution", tipDistributionSchema);
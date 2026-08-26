import mongoose from "mongoose";

const DailyRevenueSchema = new mongoose.Schema(
  {
    reportId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "MonthlyReport", 
      required: true 
    },
    date: { type: String, required: true },
    dayOfWeek: { type: String, required: true },
    founderPoints: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    preTaxRevenue: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    guestCount: { type: Number, default: 0 },
    billCount: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// Tạo compound unique index để tránh trùng lặp trong cùng 1 tháng
DailyRevenueSchema.index({ reportId: 1, date: 1 }, { unique: true });

DailyRevenueSchema.pre("save", function (next) {
  this.totalGross = (this.cash || 0) + (this.transfer || 0) + (this.card || 0) + (this.debt || 0) + (this.founderPoints || 0);
  next();
});

export default mongoose.model("DailyRevenue", DailyRevenueSchema);
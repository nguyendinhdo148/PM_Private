import mongoose from "mongoose";

const MonthlyReportSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true,
    }, // Định dạng: "YYYY-MM" (VD: "2026-04")

    title: {
      type: String,
      required: true,
    }, // VD: "Tháng 04/2026"

    // =========================
    // CHI PHÍ HÀNG THÁNG
    // =========================

    rent: {
      type: Number,
      default: 0,
    }, // Mặt bằng

    electricity: {
      type: Number,
      default: 0,
    }, // Điện

    water: {
      type: Number,
      default: 0,
    }, // Nước

    internet: {
      type: Number,
      default: 0,
    }, // Internet

    telephone: {
      type: Number,
      default: 0,
    }, // Điện thoại

    garbage: {
      type: Number,
      default: 0,
    }, // Rác

    employeeSalary: {
      type: Number,
      default: 0,
    }, // Lương nhân viên

    otherExpense: {
      type: Number,
      default: 0,
    }, // Khác
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MonthlyReport", MonthlyReportSchema);
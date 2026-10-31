
import mongoose from "mongoose";

const MonthlyReportSchema = new mongoose.Schema(
  {
    monthKey: {
      type: String,
      required: true,
      unique: true,
    }, // Định dạng: "YYYY-MM"

    title: {
      type: String,
      required: true,
    },

    // =========================
    // DOANH THU KHÁC HÀNG THÁNG
    // =========================

    additionalRevenue: {
      type: Number,
      default: 0,
    }, // Khoản thu linh tinh ngoài doanh thu ngày

    // =========================
    // CHI PHÍ HÀNG THÁNG
    // =========================

    rent: {
      type: Number,
      default: 0,
    },

    electricity: {
      type: Number,
      default: 0,
    },

    water: {
      type: Number,
      default: 0,
    },

    internet: {
      type: Number,
      default: 0,
    },

    telephone: {
      type: Number,
      default: 0,
    },

    garbage: {
      type: Number,
      default: 0,
    },

    employeeSalary: {
      type: Number,
      default: 0,
    },

    otherExpense: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("MonthlyReport", MonthlyReportSchema);

import mongoose from "mongoose";

const SessionRevenueSchema = new mongoose.Schema(
  {
    cash: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    founderPoints: { type: Number, default: 0 },
    foodRevenue: { type: Number, default: 0 },
    drinkRevenue: { type: Number, default: 0 },
    otherRevenue: { type: Number, default: 0 },
    guestCount: { type: Number, default: 0 },
    billCount: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const DailyRevenueSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MonthlyReport",
      required: true,
    },

    date: { type: String, required: true },

    dayOfWeek: { type: String, required: true },

    // 👇 THÊM MỚI: 2 buổi
    lunch: { type: SessionRevenueSchema, default: () => ({}) },
    dinner: { type: SessionRevenueSchema, default: () => ({}) },

    founderPoints: { type: Number, default: 0 },

    cash: { type: Number, default: 0 },

    transfer: { type: Number, default: 0 },

    card: { type: Number, default: 0 },

    debt: { type: Number, default: 0 },

    foodRevenue: { type: Number, default: 0 },

    drinkRevenue: { type: Number, default: 0 },

    otherRevenue: { type: Number, default: 0 },

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

// 👇 THÊM MỚI: nếu có gọi .save() thì tự cộng lunch + dinner → các field tổng
DailyRevenueSchema.pre("save", function (next) {
  const sum = (a, b) => (Number(a) || 0) + (Number(b) || 0);
  const l = this.lunch || {};
  const d = this.dinner || {};

  // Nếu có lunch/dinner thì cộng lại, không thì giữ nguyên các field tổng cũ
  const hasSessions =
    l.cash || l.transfer || l.card || l.debt || l.founderPoints ||
    l.foodRevenue || l.drinkRevenue || l.otherRevenue ||
    l.guestCount || l.billCount ||
    d.cash || d.transfer || d.card || d.debt || d.founderPoints ||
    d.foodRevenue || d.drinkRevenue || d.otherRevenue ||
    d.guestCount || d.billCount;

  if (hasSessions) {
    this.cash = sum(l.cash, d.cash);
    this.transfer = sum(l.transfer, d.transfer);
    this.card = sum(l.card, d.card);
    this.debt = sum(l.debt, d.debt);
    this.founderPoints = sum(l.founderPoints, d.founderPoints);
    this.foodRevenue = sum(l.foodRevenue, d.foodRevenue);
    this.drinkRevenue = sum(l.drinkRevenue, d.drinkRevenue);
    this.otherRevenue = sum(l.otherRevenue, d.otherRevenue);
    this.guestCount = sum(l.guestCount, d.guestCount);
    this.billCount = sum(l.billCount, d.billCount);

    const notes = [l.note, d.note].filter(Boolean);
    this.note = notes.join(" | ");

    this.preTaxRevenue = Math.round(
      (Number(this.foodRevenue) +
        Number(this.drinkRevenue) +
        Number(this.otherRevenue)) *
        1.05
    );
  }

  this.totalGross =
    (this.cash || 0) +
    (this.transfer || 0) +
    (this.card || 0) +
    (this.debt || 0) +
    (this.founderPoints || 0);

  next();
});

export default mongoose.model("DailyRevenue", DailyRevenueSchema);
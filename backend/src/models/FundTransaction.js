import mongoose from "mongoose";

const fundTransactionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: { 
      type: String, 
      trim: true 
    },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "ADVANCE", "REFUND"], 
      required: true,
    },
    amount: { 
      type: Number, 
      required: true,
      min: [0, "Số tiền giao dịch không được là số âm"], 
    },
    // Ngày thực hiện/Ngày thêm giao dịch (Do user chọn hoặc mặc định là lúc tạo)
    transactionDate: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    // ---- Dành riêng cho trạng thái "Ứng quỹ" (ADVANCE) ----
    isRecovered: { 
      type: Boolean, 
      default: function() {
        return this.type === "ADVANCE" ? false : undefined;
      }
    },
    recoveryDate: { 
      type: Date 
    },
    // -------------------------------------------------------
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  // timestamps tự động tạo ra createdAt (ngày tạo trên hệ thống) và updatedAt
  { timestamps: true }
);

export const FundTransaction = mongoose.model("FundTransaction", fundTransactionSchema);
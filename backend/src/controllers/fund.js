import { FundTransaction } from "../models/FundTransaction.js";

export const fundController = {
  // ĐỌC (READ) - Đổi tên thành getFunds
  getFunds: async (req, res) => {
    try {
      const totals = await FundTransaction.aggregate([
        { $group: { _id: "$type", total: { $sum: "$amount" } } }
      ]);

      const stats = { DEPOSIT: 0, WITHDRAWAL: 0, ADVANCE: 0, REFUND: 0 };
      totals.forEach(t => { stats[t._id] = t.total; });

      const currentBalance = (stats.DEPOSIT + stats.REFUND) - (stats.WITHDRAWAL + stats.ADVANCE);

      const transactions = await FundTransaction.find()
        .populate("createdBy", "name email")
        .sort({ transactionDate: -1 });

      res.status(200).json({
        success: true,
        data: { currentBalance, stats, transactions }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    }
  },

  // THÊM (CREATE)
  addTransaction: async (req, res) => {
    try {
      const { title, description, type, amount, transactionDate } = req.body;
      const userId = req.user._id;

      const newTransaction = await FundTransaction.create({
        title,
        description,
        type,
        amount,
        transactionDate: new Date(transactionDate),
        createdBy: userId,
      });

      res.status(201).json({ success: true, message: "Thêm giao dịch thành công", data: newTransaction });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi thêm giao dịch", error: error.message });
    }
  },

  // SỬA (UPDATE)
  updateTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const { title, description, type, amount, transactionDate } = req.body;

      const updateData = { title, description, type, amount };
      if (transactionDate) updateData.transactionDate = new Date(transactionDate);

      const updatedTx = await FundTransaction.findByIdAndUpdate(
        transactionId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedTx) {
        return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
      }

      res.status(200).json({ success: true, message: "Cập nhật thành công", data: updatedTx });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật", error: error.message });
    }
  },

  // XÓA (DELETE)
  deleteTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const deletedTx = await FundTransaction.findByIdAndDelete(transactionId);

      if (!deletedTx) {
        return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
      }

      res.status(200).json({ success: true, message: "Đã xóa giao dịch thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi khi xóa", error: error.message });
    }
  },

  // THU HỒI TIỀN ỨNG (RECOVER)
  recoverAdvance: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user._id;

      const advanceTx = await FundTransaction.findById(transactionId);
      if (!advanceTx || advanceTx.type !== "ADVANCE" || advanceTx.isRecovered) {
        return res.status(400).json({ success: false, message: "Khoản ứng không tồn tại hoặc đã thu hồi." });
      }

      advanceTx.isRecovered = true;
      advanceTx.recoveryDate = new Date(); 
      await advanceTx.save();

      const refundTx = await FundTransaction.create({
        title: `Thu hồi tiền ứng: ${advanceTx.title}`,
        type: "REFUND",
        amount: advanceTx.amount,
        transactionDate: new Date(),
        createdBy: userId,
      });

      res.status(200).json({ success: true, message: "Đã thực hiện thu hồi quỹ!", data: refundTx });
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi hệ thống thu hồi", error: error.message });
    }
  }
};
import { WineCommission } from "../models/WineCommission.js";

// HÀM LOGIC TÍNH TOÁN (Tái sử dụng)
const calculateCommissionLogic = (items) => {
  let totalBillAmount = 0;
  let hasVipBottle = false;

  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalBillAmount += itemTotal;
    // Kiểm tra xem có chai nào giá gốc >= 10 củ không
    if (item.price >= 10000000) {
      hasVipBottle = true;
    }
  });

  let commissionEarned = 0;

  if (hasVipBottle) {
    // Ăn 10% tổng bill
    commissionEarned = totalBillAmount * 0.1;
  } else {
    // Xét các mốc cố định
    if (totalBillAmount >= 10000000) {
      commissionEarned = 500000;
    } else if (totalBillAmount >= 5000000) {
      commissionEarned = 300000;
    } else if (totalBillAmount >= 3000000) {
      commissionEarned = 100000;
    }
  }

  return { totalBillAmount, commissionEarned, hasVipBottle };
};

// [CREATE] Tạo mới 1 Bill Hoa Hồng
export const createCommissionBill = async (req, res) => {
  try {
    const { date, staffName, customerName, invoiceNumber, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Bill phải có ít nhất 1 loại rượu" });
    }

    // Server tự tính toán lại để tránh gian lận từ client
    const calcResult = calculateCommissionLogic(items);

    const newBill = new WineCommission({
      date,
      staffName,
      customerName,
      invoiceNumber,
      items: items.map(item => ({
        ...item,
        totalPrice: item.price * item.quantity
      })),
      totalBillAmount: calcResult.totalBillAmount,
      commissionEarned: calcResult.commissionEarned,
      isVipRuleApplied: calcResult.hasVipBottle
    });

    await newBill.save();
    return res.status(201).json({ success: true, data: newBill });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [READ ALL] Lấy danh sách toàn bộ lịch sử Bill
export const getAllCommissionBills = async (req, res) => {
  try {
    const bills = await WineCommission.find().sort({ date: -1, createdAt: -1 });
    return res.status(200).json({ success: true, data: bills });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [UPDATE] Chỉnh sửa 1 Bill đã lưu
export const updateCommissionBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, staffName, customerName, invoiceNumber, items } = req.body;

    const calcResult = calculateCommissionLogic(items);

    const updatedData = {
      date,
      staffName,
      customerName,
      invoiceNumber,
      items: items.map(item => ({
        ...item,
        totalPrice: item.price * item.quantity
      })),
      totalBillAmount: calcResult.totalBillAmount,
      commissionEarned: calcResult.commissionEarned,
      isVipRuleApplied: calcResult.hasVipBottle
    };

    const updatedBill = await WineCommission.findByIdAndUpdate(id, updatedData, { new: true });
    
    if (!updatedBill) return res.status(404).json({ success: false, message: "Không tìm thấy Bill" });

    return res.status(200).json({ success: true, data: updatedBill });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [DELETE] Xóa 1 Bill
export const deleteCommissionBill = async (req, res) => {
  try {
    const { id } = req.params;
    await WineCommission.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};
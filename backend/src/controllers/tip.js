import { TipDistribution } from "../models/TipDistribution.js";

const calculateDistribution = ({
  totalTip,
  carryOver,
  staffList,
  topPerformerName,
  applyBonus,
}) => {
  const bonusAmount = applyBonus ? 500000 : 0;
  const serviceFundPercent = 5;

  // TỔNG = TIP + TỒN KÌ TRƯỚC
  const grandTotal = Number(totalTip) + Number(carryOver || 0);
  const remainingTip = Math.max(0, grandTotal - bonusAmount);

  // TÍNH CÔNG THỰC TẾ
  const enrichedStaff = staffList.map((staff) => {
    const workDays = Number(staff.workDays) || 0;
    const deductedDays = Number(staff.deductedDays) || 0;
    const effectiveDays = Math.max(0, workDays - deductedDays);
    return { ...staff, workDays, deductedDays, effectiveDays };
  });

  const totalDays = enrichedStaff.reduce((acc, s) => acc + s.effectiveDays, 0);
  const tipPerDay = totalDays > 0 ? remainingTip / totalDays : 0;

  let totalPenalty = 0;
  let totalServiceFund = 0;

  const details = enrichedStaff.map((staff) => {
    const isTopPerformer = staff.employeeName === topPerformerName;

    // CƠ BẢN = công thực tế × 1 công
    const baseTip = staff.effectiveDays * tipPerDay;

    // TIỀN PHẠT = trừ công × 1 công (ĐỂ RIÊNG, KHÔNG CỘNG VÀO QUỸ)
    const penaltyAmount = staff.deductedDays * tipPerDay;

    // QUỸ PHỤC VỤ = 5% của CƠ BẢN (chỉ FOH)
    let fundDeduction = 0;
    if (staff.department === "FOH") {
      fundDeduction = baseTip * (serviceFundPercent / 100);
    }

    // THỰC NHẬN = Cơ bản − Quỹ + Thưởng TOP (tiền phạt đã bị trừ gián tiếp qua việc dùng công thực tế)
    let finalTip = baseTip - fundDeduction;
    if (isTopPerformer) finalTip += bonusAmount;

    totalPenalty += penaltyAmount;
    totalServiceFund += fundDeduction;

    return {
      employeeName: staff.employeeName,
      department: staff.department,
      workDays: staff.workDays,
      deductedDays: staff.deductedDays,
      effectiveDays: staff.effectiveDays,
      isTopPerformer,
      baseTip,
      penaltyAmount,
      fundDeduction,
      finalTip,
    };
  });

  return {
    bonusAmount,
    serviceFundPercent,
    totalDays,
    tipPerDay,
    totalPenalty,
    totalServiceFund,
    details,
  };
};

// [CREATE]
export const createTipDistribution = async (req, res) => {
  try {
    const {
      month,
      periodName,
      totalTip,
      carryOver,
      staffList,
      topPerformerName,
      applyBonus = true,
    } = req.body;

    const calc = calculateDistribution({
      totalTip,
      carryOver,
      staffList,
      topPerformerName,
      applyBonus,
    });

    const newDistribution = new TipDistribution({
      month,
      periodName,
      totalTip,
      carryOver: Number(carryOver) || 0,
      applyBonus,
      ...calc,
    });

    await newDistribution.save();
    return res.status(201).json({ success: true, data: newDistribution });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [READ ALL]
export const getTipDistributions = async (req, res) => {
  try {
    const data = await TipDistribution.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [READ ONE]
export const getTipDistributionById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await TipDistribution.findById(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu kỳ này" });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// [UPDATE]
export const updateTipDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      month,
      periodName,
      totalTip,
      carryOver,
      staffList,
      topPerformerName,
      applyBonus = true,
    } = req.body;

    const calc = calculateDistribution({
      totalTip,
      carryOver,
      staffList,
      topPerformerName,
      applyBonus,
    });

    const updateData = {
      month,
      periodName,
      totalTip,
      carryOver: Number(carryOver) || 0,
      applyBonus,
      ...calc,
    };

    const updatedDistribution = await TipDistribution.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedDistribution) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu" });
    }

    return res.status(200).json({ success: true, data: updatedDistribution });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật",
      error: error.message,
    });
  }
};

// [DELETE]
export const deleteTipDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedData = await TipDistribution.findByIdAndDelete(id);
    if (!deletedData) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu để xóa" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Xóa kỳ chia tip thành công!" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa",
      error: error.message,
    });
  }
};
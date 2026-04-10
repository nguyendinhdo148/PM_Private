import { TipDistribution } from "../models/TipDistribution.js";

// [CREATE] Tạo và tính toán kỳ chia tip mới
export const createTipDistribution = async (req, res) => {
  try {
    const { month, periodName, totalTip, staffList, topPerformerName } = req.body;
    const bonusAmount = 500000;
    const serviceFundPercent = 5;

    // 1. Trừ 500k thưởng Top
    const remainingTip = Math.max(0, totalTip - bonusAmount);

    // 2. Tính tổng công
    const totalDays = staffList.reduce((acc, staff) => acc + Number(staff.workDays), 0);

    // 3. Tính tiền trung bình mỗi công
    const tipPerDay = totalDays > 0 ? remainingTip / totalDays : 0;

    // 4. Tính toán chi tiết cho từng nhân viên
    const details = staffList.map((staff) => {
      const isTopPerformer = staff.employeeName === topPerformerName;
      const baseTip = staff.workDays * tipPerDay;
      
      let fundDeduction = 0;
      let finalTip = baseTip;

      // FOH thì trừ 5% quỹ phục vụ
      if (staff.department === "FOH") {
        fundDeduction = baseTip * (serviceFundPercent / 100);
        finalTip = baseTip - fundDeduction;
      }

      // Cộng tiền thưởng nếu là Top
      if (isTopPerformer) {
        finalTip += bonusAmount;
      }

      return {
        employeeName: staff.employeeName,
        department: staff.department,
        workDays: Number(staff.workDays),
        isTopPerformer,
        baseTip,
        fundDeduction,
        finalTip,
      };
    });

    const newDistribution = new TipDistribution({
      month,
      periodName,
      totalTip,
      bonusAmount,
      serviceFundPercent,
      totalDays,
      tipPerDay,
      details,
    });

    await newDistribution.save();
    return res.status(201).json({ success: true, data: newDistribution });
  } catch (error) {
    console.error("Error creating tip distribution:", error);
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [READ ALL] Lấy danh sách tất cả các kỳ
export const getTipDistributions = async (req, res) => {
  try {
    const data = await TipDistribution.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [READ ONE] Lấy chi tiết 1 kỳ chia tip theo ID
export const getTipDistributionById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await TipDistribution.findById(id);
    
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu kỳ này" });
    }
    
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// [UPDATE] Cập nhật 1 kỳ chia tip (Sẽ tính toán lại từ đầu với data mới)
export const updateTipDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, periodName, totalTip, staffList, topPerformerName } = req.body;
    
    const bonusAmount = 500000;
    const serviceFundPercent = 5;

    // Tính toán lại y như lúc Create để đảm bảo số liệu luôn đúng
    const remainingTip = Math.max(0, totalTip - bonusAmount);
    const totalDays = staffList.reduce((acc, staff) => acc + Number(staff.workDays), 0);
    const tipPerDay = totalDays > 0 ? remainingTip / totalDays : 0;

    const details = staffList.map((staff) => {
      const isTopPerformer = staff.employeeName === topPerformerName;
      const baseTip = staff.workDays * tipPerDay;
      let fundDeduction = 0;
      let finalTip = baseTip;

      if (staff.department === "FOH") {
        fundDeduction = baseTip * (serviceFundPercent / 100);
        finalTip = baseTip - fundDeduction;
      }

      if (isTopPerformer) {
        finalTip += bonusAmount;
      }

      return {
        employeeName: staff.employeeName,
        department: staff.department,
        workDays: Number(staff.workDays),
        isTopPerformer,
        baseTip,
        fundDeduction,
        finalTip,
      };
    });

    // Bản ghi cập nhật
    const updateData = {
      month,
      periodName,
      totalTip,
      bonusAmount,
      serviceFundPercent,
      totalDays,
      tipPerDay,
      details,
    };

    const updatedDistribution = await TipDistribution.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true } // new: true trả về data sau khi update
    );

    if (!updatedDistribution) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu để cập nhật" });
    }

    return res.status(200).json({ success: true, data: updatedDistribution });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server khi cập nhật", error: error.message });
  }
};

// [DELETE] Xóa 1 kỳ chia tip
export const deleteTipDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedData = await TipDistribution.findByIdAndDelete(id);

    if (!deletedData) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu để xóa" });
    }

    return res.status(200).json({ success: true, message: "Xóa kỳ chia tip thành công!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server khi xóa", error: error.message });
  }
};
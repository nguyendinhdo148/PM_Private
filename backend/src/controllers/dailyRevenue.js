import DailyRevenue from "../models/dailyRevenue.js";
import MonthlyReport from "../models/monthlyReport.js";

// [POST] Import nhiều ngày doanh thu cùng lúc
export const bulkImport = async (req, res) => {
  try {
    const { reportId, data } = req.body;

    if (!reportId || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "reportId và danh sách dữ liệu là bắt buộc",
      });
    }

    // Kiểm tra reportId có tồn tại không
    const reportExists = await MonthlyReport.findById(reportId);
    if (!reportExists) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo tháng!",
      });
    }

    const dates = [...new Set(data.map((item) => item.date).filter(Boolean))];
    const existingRevenues = await DailyRevenue.find({
      reportId,
      date: { $in: dates },
    }).select("date -_id");
    const existingDates = [
      ...new Set(existingRevenues.map((revenue) => revenue.date)),
    ];

    const existingDateSet = new Set(existingDates);
    const revenues = data
      .filter((item) => item.date && !existingDateSet.has(item.date))
      .map((item) => {
        const cash = Number(item.cash) || 0;
        const transfer = Number(item.transfer) || 0;
        const card = Number(item.card) || 0;
        const debt = Number(item.debt) || 0;
        const founderPoints = Number(item.founderPoints) || 0;

        return {
          ...item,
          reportId,
          totalGross: cash + transfer + card + debt + founderPoints,
        };
      });
    
    const savedRevenues = revenues.length > 0
      ? await DailyRevenue.insertMany(revenues)
      : [];

    return res.status(201).json({
      success: true,
      data: savedRevenues,
      skippedDates: existingDates,
      message: existingDates.length > 0
        ? `Đã bỏ qua ${existingDates.length} ngày đã tồn tại`
        : undefined,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] Thêm doanh thu ngày mới
export const create = async (req, res) => {
  try {
    const { reportId, date } = req.body;
    
    if (!reportId || !date) {
      return res.status(400).json({
        success: false,
        message: "reportId và date là bắt buộc",
      });
    }

    const reportExists = await MonthlyReport.findById(reportId);
    if (!reportExists) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo tháng!",
      });
    }

    const existingRevenue = await DailyRevenue.findOne({ reportId, date });
    if (existingRevenue) {
      return res.status(400).json({
        success: false,
        message: `Doanh thu ngày ${date} đã tồn tại trong báo cáo này!`,
      });
    }

    const newRevenue = new DailyRevenue(req.body);
    const savedRevenue = await newRevenue.save();
    return res.status(201).json({ success: true, data: savedRevenue });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Doanh thu ngày này đã tồn tại!",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] Lấy danh sách doanh thu CỦA 1 THÁNG (Lọc theo reportId)
export const getAll = async (req, res) => {
  try {
    const { reportId, search, sort = "desc" } = req.query;
    let query = {};

    if (reportId) {
      query.reportId = reportId;
    } else {
      return res.status(400).json({
        success: false,
        message: "reportId là bắt buộc!",
      });
    }

    if (search) {
      query.$or = [
        { note: { $regex: search, $options: "i" } },
        { date: { $regex: search, $options: "i" } },
      ];
    }

    const sortDirection = sort === "asc" ? 1 : -1;
    const revenues = await DailyRevenue.find(query).sort({ date: sortDirection });

    return res.status(200).json({ success: true, data: revenues });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] Lấy chi tiết 1 ngày
export const getById = async (req, res) => {
  try {
    const revenue = await DailyRevenue.findById(req.params.id);
    if (!revenue) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu",
      });
    }
    return res.status(200).json({ success: true, data: revenue });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] Cập nhật báo cáo ngày
export const update = async (req, res) => {
  try {
    const { founderPoints, cash, transfer, card, debt, ...rest } = req.body;
    const totalGross = (Number(cash) || 0) + (Number(transfer) || 0) +
      (Number(card) || 0) + (Number(debt) || 0) + (Number(founderPoints) || 0);

    const updatedRevenue = await DailyRevenue.findByIdAndUpdate(
      req.params.id,
      { founderPoints, cash, transfer, card, debt, totalGross, ...rest },
      { new: true, runValidators: true }
    );

    if (!updatedRevenue) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu để sửa",
      });
    }
    return res.status(200).json({ success: true, data: updatedRevenue });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] Xóa báo cáo ngày
export const remove = async (req, res) => {
  try {
    const deletedRevenue = await DailyRevenue.findByIdAndDelete(req.params.id);
    if (!deletedRevenue) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu để xóa",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Xóa thành công",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// [DELETE] Xóa toàn bộ doanh thu của 1 tháng
export const deleteByReportId = async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: "reportId là bắt buộc!",
      });
    }

    // Kiểm tra reportId có tồn tại không
    const reportExists = await MonthlyReport.findById(reportId);
    if (!reportExists) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo tháng!",
      });
    }

    // Xóa tất cả dailyrevenues của tháng này
    const result = await DailyRevenue.deleteMany({ reportId: reportId });

    return res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} bản ghi của tháng!`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
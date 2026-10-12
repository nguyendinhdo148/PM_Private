
import mongoose from "mongoose";
import { Attendance } from "../models/Attendance.js";
import { Employee } from "../models/employee.js";

const isValidMonthYear = (month, year) => {
  const m = Number(month);
  const y = Number(year);
  return Number.isInteger(m) && m >= 1 && m <= 12 &&
    Number.isInteger(y) && y >= 2000 && y <= 2100;
};

const formatLocalDate = (year, month, day) =>
  [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");

// Kỳ công được đặt tên theo tháng kết thúc: 26 tháng trước đến hết ngày 25 tháng chọn.
const getPayPeriodBounds = (month, year) => ({
  start: new Date(Number(year), Number(month) - 2, 26),
  end: new Date(Number(year), Number(month) - 1, 25),
});

const toISODate = (date) =>
  formatLocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

const isDateInAttendancePeriod = (date, attendance) => {
  const { start, end } = getPayPeriodBounds(attendance.month, attendance.year);
  return date >= toISODate(start) && date <= toISODate(end);
};

const getDaysInMonth = (month, year) =>
  new Date(Number(year), Number(month), 0).getDate();

const getDayOfWeek = (year, month, day) =>
  new Date(Number(year), Number(month) - 1, Number(day)).getDay();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isValidTime = (value) =>
  value == null || value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ensureEditable = (attendance, res) => {
  if (attendance.status === "LOCKED") {
    res.status(400).json({
      success: false,
      message: "Bảng công đã khóa, không thể chỉnh sửa.",
    });
    return false;
  }
  return true;
};

const normalizeScheduleDay = (config = {}) => {
  const status = config.status || "WORK";
  if (!["WORK", "OFF", "P", "ABSENT", "HOLIDAY"].includes(status)) {
    throw new Error(`Trạng thái lịch làm không hợp lệ: ${status}`);
  }

  const shiftTime = config.shiftTime || null;
  if (!isValidTime(shiftTime)) {
    throw new Error("Giờ làm phải theo định dạng HH:mm.");
  }

  const shiftType = config.shiftType || null;
  if (
    shiftType &&
    !["SHIFT_1", "SHIFT_2", "SHIFT_3", "SHIFT_4", "CUSTOM"].includes(shiftType)
  ) {
    throw new Error("Loại ca làm không hợp lệ.");
  }

  if (status === "WORK" && !shiftTime) {
    throw new Error("Ngày WORK phải có giờ làm từ lịch phân ca.");
  }

  return {
    status,
    shiftType: status === "WORK" ? shiftType : null,
    shiftTime: status === "WORK" ? shiftTime : null,
    isWeeklyOff: status === "OFF" && config.isWeeklyOff === true,
    note: config.note || "",
  };
};

const buildDailyRecords = ({ month, year, schedule }) => {
  if (!schedule?.weeklySchedule ||
      Object.keys(schedule.weeklySchedule).length === 0) {
    throw new Error("Nhân viên chưa có lịch phân ca theo thứ trong tuần.");
  }

  const { start, end } = getPayPeriodBounds(month, year);
  const overrides = schedule.dateOverrides || {};
  const records = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = toISODate(cursor);
    const dayOfMonth = cursor.getDate();
    const dayOfWeek = cursor.getDay();
    const weeklyConfig = schedule.weeklySchedule[dayOfWeek];

    if (!weeklyConfig) {
      throw new Error(`Chưa cấu hình lịch làm cho thứ ${dayOfWeek} của ngày ${date}.`);
    }

    const normalized = normalizeScheduleDay({
      ...weeklyConfig,
      ...(overrides[date] || {}),
    });

    records.push({ date, dayOfMonth, dayOfWeek, ...normalized });
  }

  return records;
};

const createEmployeeSnapshot = (employee) => ({
  employee: employee._id,
  employeeCode: employee.workInfo?.employeeCode || "",
  employeeName: employee.name,
  department: employee.workInfo?.department || "",
  position: employee.workInfo?.position || "",
});

// POST /api-v1/attendance/generate
export const generateMonthlyAttendance = asyncHandler(async (req, res) => {
  const { month, year, employeeIds, scheduleByEmployee } = req.body;

  if (!isValidMonthYear(month, year)) {
    return res.status(400).json({
      success: false,
      message: "Tháng hoặc năm không hợp lệ.",
    });
  }

  if (!scheduleByEmployee || typeof scheduleByEmployee !== "object") {
    return res.status(400).json({
      success: false,
      message: "Thiếu dữ liệu lịch phân ca.",
    });
  }

  const query = { status: { $in: ["ACTIVE", "PROBATION"] } };

  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    if (!employeeIds.every(isValidObjectId)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách mã nhân viên không hợp lệ.",
      });
    }
    query._id = { $in: employeeIds };
  }

  const employees = await Employee.find(query).lean();

  if (!employees.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy nhân viên phù hợp.",
    });
  }

  const existing = await Attendance.find({
    employee: { $in: employees.map((e) => e._id) },
    month: Number(month),
    year: Number(year),
  }).select("employee employeeName status").lean();

  const existingMap = new Map(
    existing.map((item) => [String(item.employee), item])
  );

  const created = [];
  const skipped = [];
  const errors = [];

  for (const employee of employees) {
    const employeeId = String(employee._id);
    const existingAttendance = existingMap.get(employeeId);

    if (existingAttendance) {
      skipped.push({
        employeeId,
        employeeName: employee.name,
        reason: "Nhân viên đã có bảng công trong kỳ này.",
      });
      continue;
    }

    try {
      const schedule = scheduleByEmployee[employeeId];
      if (!schedule) {
        throw new Error("Chưa có dữ liệu lịch phân ca cho nhân viên.");
      }

      const dailyRecords = buildDailyRecords({
        month: Number(month),
        year: Number(year),
        schedule,
      });

      const attendance = new Attendance({
        ...createEmployeeSnapshot(employee),
        month: Number(month),
        year: Number(year),
        weeklyOffAllowance: schedule.weeklyOffAllowance ?? 1,
        monthlyPAllowance: schedule.monthlyPAllowance ?? 1,
        workSchedule: {
          weeklyOffAllowance: schedule.weeklyOffAllowance ?? 1,
          monthlyPAllowance: schedule.monthlyPAllowance ?? 1,
          weeklySchedule: schedule.weeklySchedule,
          dateOverrides: schedule.dateOverrides || {},
        },
        dailyRecords,
        overtimeEntries: [],
        status: "DRAFT",
      });

      await attendance.save();
      created.push(attendance);
    } catch (error) {
      errors.push({
        employeeId,
        employeeName: employee.name,
        message: error.message,
      });
    }
  }

  return res.status(201).json({
    success: true,
    message: "Đã xử lý tạo bảng chấm công.",
    data: {
      createdCount: created.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      created,
      skipped,
      errors,
    },
  });
});

// POST /api-v1/attendance
export const createAttendance = asyncHandler(async (req, res) => {
  const { employeeId, month, year, schedule } = req.body;

  if (!isValidObjectId(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Mã nhân viên không hợp lệ.",
    });
  }

  if (!isValidMonthYear(month, year)) {
    return res.status(400).json({
      success: false,
      message: "Tháng hoặc năm không hợp lệ.",
    });
  }

  if (!schedule) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp lịch phân ca.",
    });
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy nhân viên.",
    });
  }

  const existing = await Attendance.findOne({
    employee: employee._id,
    month: Number(month),
    year: Number(year),
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Bảng công của nhân viên trong kỳ đã tồn tại.",
      data: existing,
    });
  }

  const dailyRecords = buildDailyRecords({
    month: Number(month),
    year: Number(year),
    schedule,
  });

  const attendance = await Attendance.create({
    ...createEmployeeSnapshot(employee),
    month: Number(month),
    year: Number(year),
    weeklyOffAllowance: schedule.weeklyOffAllowance ?? 1,
    monthlyPAllowance: schedule.monthlyPAllowance ?? 1,
    workSchedule: {
      weeklyOffAllowance: schedule.weeklyOffAllowance ?? 1,
      monthlyPAllowance: schedule.monthlyPAllowance ?? 1,
      weeklySchedule: schedule.weeklySchedule,
      dateOverrides: schedule.dateOverrides || {},
    },
    dailyRecords,
    overtimeEntries: [],
  });

  return res.status(201).json({
    success: true,
    message: "Tạo bảng chấm công thành công.",
    data: attendance,
  });
});

// GET /api-v1/attendance
export const getAttendances = asyncHandler(async (req, res) => {
  const { month, year, department, employeeId, status } = req.query;
  const query = {};

  if (month !== undefined || year !== undefined) {
    if (!isValidMonthYear(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tháng và năm hợp lệ.",
      });
    }
    query.month = Number(month);
    query.year = Number(year);
  }

  if (department) query.department = department;

  if (employeeId) {
    if (!isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }
    query.employee = employeeId;
  }

  if (status) query.status = status;

  const attendances = await Attendance.find(query)
    .populate("employee")
    .sort({ department: 1, employeeName: 1 });

  return res.status(200).json({
    success: true,
    count: attendances.length,
    data: attendances,
  });
});

// GET /api-v1/attendance/:id
export const getAttendanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id).populate("employee");

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  return res.status(200).json({ success: true, data: attendance });
});

// PUT /api-v1/attendance/:id/day
export const updateAttendanceDay = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, status, shiftType, shiftTime, isWeeklyOff, note } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công không hợp lệ.",
    });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Ngày chấm công không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  if (!ensureEditable(attendance, res)) return;

  if (!isDateInAttendancePeriod(date, attendance)) {
    return res.status(400).json({
      success: false,
      message: "Ngày không thuộc kỳ công từ ngày 26 đến ngày 25.",
    });
  }

  const record = attendance.dailyRecords.find((item) => item.date === date);

  if (!record) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy dòng chấm công của ngày này.",
    });
  }

  try {
    const normalized = normalizeScheduleDay({
      status: status ?? record.status,
      shiftType: shiftType ?? record.shiftType,
      shiftTime: shiftTime ?? record.shiftTime,
      isWeeklyOff: isWeeklyOff ?? record.isWeeklyOff,
      note: note ?? record.note,
    });

    Object.assign(record, normalized);
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật chấm công thành công.",
      data: attendance,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api-v1/attendance/:id/overtime
export const addOvertimeEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, hours, note } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công không hợp lệ.",
    });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Ngày OT không hợp lệ.",
    });
  }

  const numericHours = Number(hours);
  if (
    !Number.isFinite(numericHours) ||
    numericHours === 0 ||
    numericHours < -24 ||
    numericHours > 24
  ) {
    return res.status(400).json({
      success: false,
      message: "Số giờ OT phải khác 0 và nằm trong khoảng -24 đến 24.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  if (!ensureEditable(attendance, res)) return;

  if (!isDateInAttendancePeriod(date, attendance)) {
    return res.status(400).json({
      success: false,
      message: "Ngày OT không thuộc kỳ công từ ngày 26 đến ngày 25.",
    });
  }

  attendance.overtimeEntries.push({ date, hours: numericHours, note: note || "" });
  await attendance.save();

  return res.status(201).json({
    success: true,
    message: "Thêm khoản OT thành công.",
    data: attendance,
  });
});

// PUT /api-v1/attendance/:id/overtime/:entryId
export const updateOvertimeEntry = asyncHandler(async (req, res) => {
  const { id, entryId } = req.params;
  const { date, hours, note } = req.body;

  if (!isValidObjectId(id) || !isValidObjectId(entryId)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công hoặc mã OT không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  if (!ensureEditable(attendance, res)) return;

  const entry = attendance.overtimeEntries.id(entryId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy khoản OT.",
    });
  }

  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Ngày OT không hợp lệ.",
      });
    }

    if (!isDateInAttendancePeriod(date, attendance)) {
      return res.status(400).json({
        success: false,
        message: "Ngày OT không thuộc kỳ công từ ngày 26 đến ngày 25.",
      });
    }

    entry.date = date;
  }

  if (hours !== undefined) {
    const numericHours = Number(hours);
    if (
      !Number.isFinite(numericHours) ||
      numericHours === 0 ||
      numericHours < -24 ||
      numericHours > 24
    ) {
      return res.status(400).json({
        success: false,
        message: "Số giờ OT không hợp lệ.",
      });
    }
    entry.hours = numericHours;
  }

  if (note !== undefined) entry.note = note;

  await attendance.save();

  return res.status(200).json({
    success: true,
    message: "Cập nhật khoản OT thành công.",
    data: attendance,
  });
});

// DELETE /api-v1/attendance/:id/overtime/:entryId
export const deleteOvertimeEntry = asyncHandler(async (req, res) => {
  const { id, entryId } = req.params;

  if (!isValidObjectId(id) || !isValidObjectId(entryId)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công hoặc mã OT không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  if (!ensureEditable(attendance, res)) return;

  const entry = attendance.overtimeEntries.id(entryId);

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy khoản OT.",
    });
  }

  entry.deleteOne();
  await attendance.save();

  return res.status(200).json({
    success: true,
    message: "Xóa khoản OT thành công.",
    data: attendance,
  });
});

// PATCH /api-v1/attendance/:id/schedule
export const updateAttendanceSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { weeklySchedule, dateOverrides, weeklyOffAllowance, monthlyPAllowance } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng chấm công.",
    });
  }

  if (!ensureEditable(attendance, res)) return;

  if (weeklyOffAllowance !== undefined && ![1, 2].includes(Number(weeklyOffAllowance))) {
    return res.status(400).json({
      success: false,
      message: "Định mức OFF tuần phải là 1 hoặc 2.",
    });
  }

  if (
    monthlyPAllowance !== undefined &&
    (!Number.isFinite(Number(monthlyPAllowance)) || Number(monthlyPAllowance) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Định mức phép tháng không hợp lệ.",
    });
  }

  if (weeklySchedule !== undefined) {
    if (!weeklySchedule || typeof weeklySchedule !== "object" || Array.isArray(weeklySchedule)) {
      return res.status(400).json({
        success: false,
        message: "weeklySchedule phải là object theo key thứ 0-6.",
      });
    }

    try {
      for (const [day, config] of Object.entries(weeklySchedule)) {
        if (!/^[0-6]$/.test(day)) throw new Error(`Thứ không hợp lệ: ${day}`);
        normalizeScheduleDay(config);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    attendance.workSchedule.weeklySchedule = weeklySchedule;
  }

  if (dateOverrides !== undefined) {
    if (!dateOverrides || typeof dateOverrides !== "object" || Array.isArray(dateOverrides)) {
      return res.status(400).json({
        success: false,
        message: "dateOverrides phải là object theo ngày YYYY-MM-DD.",
      });
    }

    try {
      for (const [date, config] of Object.entries(dateOverrides)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw new Error(`Ngày ngoại lệ không hợp lệ: ${date}`);
        }
        normalizeScheduleDay(config);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    attendance.workSchedule.dateOverrides = dateOverrides;
  }

  if (weeklyOffAllowance !== undefined) {
    attendance.workSchedule.weeklyOffAllowance = Number(weeklyOffAllowance);
    attendance.weeklyOffAllowance = Number(weeklyOffAllowance);
  }

  if (monthlyPAllowance !== undefined) {
    attendance.workSchedule.monthlyPAllowance = Number(monthlyPAllowance);
    attendance.monthlyPAllowance = Number(monthlyPAllowance);
  }

  await attendance.save();

  return res.status(200).json({
    success: true,
    message: "Đã cập nhật lịch phân ca. Lịch chấm công từng ngày chưa bị thay đổi.",
    data: attendance,
  });
});

// PATCH /api-v1/attendance/:id/status

export const updateAttendanceStatus = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bảng công không hợp lệ.",
      });
    }

    const allowedStatuses = ["DRAFT", "CONFIRMED", "LOCKED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái bảng công không hợp lệ.",
      });
    }

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng chấm công.",
      });
    }

    const allowedTransitions = {
      DRAFT: ["CONFIRMED"],
      CONFIRMED: ["LOCKED"],
      LOCKED: ["CONFIRMED"],
    };

    if (
      status !== attendance.status &&
      !allowedTransitions[attendance.status]?.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ ${attendance.status} sang ${status}.`,
      });
    }

    attendance.status = status;
    await attendance.save();

    return res.status(200).json({
      success: true,
      message:
        status === "CONFIRMED" && attendance.status === "CONFIRMED"
          ? "Cập nhật trạng thái bảng công thành công."
          : "Cập nhật trạng thái bảng công thành công.",
      data: attendance,
    });
  }
);


// DELETE /api-v1/attendance/:id

export const deleteAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Mã bảng công không hợp lệ.",
    });
  }

  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bảng công.",
    });
  }

  // Chỉ cho phép xóa khi bảng công đã mở khóa.
  if (attendance.status === "LOCKED") {
    return res.status(400).json({
      success: false,
      message: "Vui lòng mở khóa bảng công trước khi xóa.",
    });
  }

  await attendance.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Xóa bảng chấm công thành công.",
  });
});

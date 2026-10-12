import mongoose from "mongoose";

const scheduleDaySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["WORK", "OFF", "P", "ABSENT", "HOLIDAY"],
      default: "WORK",
      required: true,
    },
    shiftType: {
      type: String,
      enum: ["SHIFT_1", "SHIFT_2", "SHIFT_3", "SHIFT_4", "CUSTOM", null],
      default: null,
    },
    shiftTime: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          return (
            value == null ||
            value === "" ||
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
          );
        },
        message: "Giờ làm phải theo định dạng HH:mm",
      },
    },
    isWeeklyOff: { type: Boolean, default: false },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const attendanceDaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    dayOfMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    status: {
      type: String,
      enum: ["WORK", "OFF", "P", "ABSENT", "HOLIDAY"],
      default: "WORK",
      required: true,
    },
    shiftType: {
      type: String,
      enum: ["SHIFT_1", "SHIFT_2", "SHIFT_3", "SHIFT_4", "CUSTOM", null],
      default: null,
    },
    shiftTime: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          return (
            value == null ||
            value === "" ||
            /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
          );
        },
        message: "Giờ làm phải theo định dạng HH:mm",
      },
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
    },
    isWeeklyOff: { type: Boolean, default: false },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const overtimeEntrySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    hours: {
      type: Number,
      required: true,
      min: -24,
      max: 24,
      validate: {
        validator(value) {
          return Number.isFinite(value) && value !== 0;
        },
        message: "Số giờ OT phải khác 0",
      },
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    employeeCode: {
      type: String,
      trim: true,
      default: "",
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    position: {
      type: String,
      trim: true,
      default: "",
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },

    // Lịch phân ca được lưu ngay trong bảng công tháng.
    workSchedule: {
      weeklyOffAllowance: {
        type: Number,
        enum: [1, 2],
        default: 1,
      },

      monthlyPAllowance: {
        type: Number,
        default: 1,
        min: 0,
      },

      // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7.
      weeklySchedule: {
        type: Map,
        of: scheduleDaySchema,
        default: () => new Map(),
      },

      // Ví dụ:
      // {
      //   "2026-10-15": { status: "P" }
      // }
      dateOverrides: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    // Định mức được lưu riêng cho bảng công của tháng.
    weeklyOffAllowance: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },

    monthlyPAllowance: {
      type: Number,
      default: 1,
      min: 0,
    },

    dailyRecords: {
      type: [attendanceDaySchema],
      default: [],
    },

    overtimeEntries: {
      type: [overtimeEntrySchema],
      default: [],
    },

    summary: {
      totalCalendarDays: { type: Number, default: 0 },
      totalWorkDays: { type: Number, default: 0 },
      totalOffDays: { type: Number, default: 0 },
      totalPDays: { type: Number, default: 0 },
      excessPDays: { type: Number, default: 0 },
      totalAbsentDays: { type: Number, default: 0 },
      totalHolidayDays: { type: Number, default: 0 },
      totalPositiveOTHours: { type: Number, default: 0 },
      totalShortfallHours: { type: Number, default: 0 },
      totalOTHours: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["DRAFT", "CONFIRMED", "LOCKED"],
      default: "DRAFT",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Tự tính lại số liệu tổng hợp trước khi validate.
attendanceSchema.pre("validate", function () {
  const days = this.dailyRecords || [];
  const overtimeEntries = this.overtimeEntries || [];

  const totalPDays = days.filter(
    (day) => day.status === "P"
  ).length;

  const totalPositiveOTHours = overtimeEntries.reduce(
    (total, entry) => total + Math.max(0, entry.hours),
    0
  );

  const totalShortfallHours = overtimeEntries.reduce(
    (total, entry) => total + Math.max(0, -entry.hours),
    0
  );

  this.summary = {
    totalCalendarDays: days.length,

    totalWorkDays: days.filter(
      (day) => day.status === "WORK"
    ).length,

    totalOffDays: days.filter(
      (day) => day.status === "OFF"
    ).length,

    totalPDays,

    excessPDays: Math.max(
      0,
      totalPDays - this.monthlyPAllowance
    ),

    totalAbsentDays: days.filter(
      (day) => day.status === "ABSENT"
    ).length,

    totalHolidayDays: days.filter(
      (day) => day.status === "HOLIDAY"
    ).length,

    totalPositiveOTHours,
    totalShortfallHours,

    totalOTHours:
      totalPositiveOTHours - totalShortfallHours,
  };
});

// Mỗi nhân viên chỉ có một bảng công cho một tháng.
attendanceSchema.index(
  { employee: 1, month: 1, year: 1 },
  { unique: true }
);

attendanceSchema.index({
  department: 1,
  year: 1,
  month: 1,
});

attendanceSchema.index({
  employeeCode: 1,
  year: 1,
  month: 1,
});

export const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);
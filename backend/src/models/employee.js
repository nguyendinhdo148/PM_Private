import mongoose from "mongoose";

/**
 * =========================================================
 * HELPER
 * =========================================================
 */

const calculateWorkingDuration = (startDate) => {
  if (!startDate) return null;

  const now = new Date();

  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();

  if (now.getDate() < startDate.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return {
    years,
    months,
    text: `${years} năm ${months} tháng`,
  };
};

/**
 * =========================================================
 * FAMILY MEMBER
 * Thành viên trong gia đình
 * =========================================================
 */

const familyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    relationship: {
      type: String,
      trim: true,
      description:
        "Mối quan hệ: cha, mẹ, chồng, vợ, con, anh/chị/em ruột...",
    },

    birthYear: {
      type: Number,
    },

    occupation: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * EMERGENCY CONTACT
 * Người liên hệ khẩn cấp
 * =========================================================
 */

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    relationship: {
      type: String,
      trim: true,
      description: "Mối quan hệ với nhân viên",
    },

    address: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * EDUCATION / TRAINING
 * Học tập / đào tạo
 * =========================================================
 */

const educationSchema = new mongoose.Schema(
  {
    fromDate: {
      type: Date,
    },

    toDate: {
      type: Date,
    },

    majorOrCertificate: {
      type: String,
      trim: true,
      description: "Chuyên ngành / chứng chỉ",
    },

    school: {
      type: String,
      trim: true,
      description: "Tên trường / cơ sở đào tạo",
    },

    degreeOrCertificate: {
      type: String,
      trim: true,
      description: "Bằng cấp / chứng chỉ",
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * WORK EXPERIENCE
 * Kinh nghiệm làm việc
 * =========================================================
 */

const workExperienceSchema = new mongoose.Schema(
  {
    fromDate: {
      type: Date,
    },

    toDate: {
      type: Date,
    },

    company: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    responsibilities: {
      type: String,
      trim: true,
      description: "Nhiệm vụ chính",
    },

    employmentType: {
      type: String,
      trim: true,
      description: "Loại hình làm việc",
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * PERSONAL INFORMATION
 * Thông tin cá nhân / sơ yếu lý lịch
 * =========================================================
 */

const personalInfoSchema = new mongoose.Schema(
  {
    dateOfBirth: {
      type: Date,
    },

    placeOfBirth: {
      type: String,
      trim: true,
    },

    hometown: {
      type: String,
      trim: true,
      description: "Nguyên quán",
    },

    idCardNumber: {
      type: String,
      trim: true,
    },

    idCardIssueDate: {
      type: Date,
    },

    idCardIssuePlace: {
      type: String,
      trim: true,
    },

    nationality: {
      type: String,
      trim: true,
      default: "Việt Nam",
    },

    ethnicity: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },

    maritalStatus: {
      type: String,
      enum: [
        "SINGLE",
        "MARRIED",
        "DIVORCED",
        "WIDOWED",
        "OTHER",
      ],
    },

    permanentAddress: {
      type: String,
      trim: true,
      description: "Địa chỉ thường trú",
    },

    currentAddress: {
      type: String,
      trim: true,
      description: "Địa chỉ hiện tại",
    },

    familyMembers: {
      type: [familyMemberSchema],
      default: [],
    },

    emergencyContact: {
      type: emergencyContactSchema,
      default: null,
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * WORK INFORMATION
 * Thông tin công việc
 * =========================================================
 */

const workInfoSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      description: "Mã nhân viên",
    },

    startDate: {
      type: Date,
      description: "Ngày nhận việc",
    },

    position: {
      type: String,
      trim: true,
      description: "Chức danh công việc",
    },

    department: {
      type: String,
      trim: true,
      description: "Phòng ban",
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * CONTRACT INFORMATION
 * Thông tin hợp đồng
 * =========================================================
 */

const contractInfoSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      trim: true,
    },

    contractType: {
      type: String,
      trim: true,
    },

    contractStartDate: {
      type: Date,
    },

    contractEndDate: {
      type: Date,
    },

    probationStartDate: {
      type: Date,
    },

    probationEndDate: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * SALARY & BENEFITS
 * Lương / bảo hiểm / thuế / ngân hàng
 * =========================================================
 */

const salaryAndBenefitsSchema = new mongoose.Schema(
  {
    taxCode: {
      type: String,
      trim: true,
      description: "Mã số thuế",
    },

    dependents: {
      type: Number,
      default: 0,
      min: 0,
      description: "Số người phụ thuộc",
    },

    socialInsuranceNumber: {
      type: String,
      trim: true,
      description: "Số sổ BHXH",
    },

    insuranceSalary: {
      type: Number,
      default: 0,
      min: 0,
      description: "Mức lương đóng bảo hiểm",
    },

    baseSalary: {
      type: Number,
      default: 0,
      min: 0,
      description: "Lương cơ bản",
    },

    paymentMethod: {
      type: String,
      trim: true,
      description: "Phương thức thanh toán",
    },

    bankName: {
      type: String,
      trim: true,
      description: "Tên ngân hàng",
    },

    bankBranch: {
      type: String,
      trim: true,
      description: "Chi nhánh ngân hàng",
    },

    bankAccountNumber: {
      type: String,
      trim: true,
      description: "Số tài khoản",
    },

    paymentPeriod: {
      type: String,
      trim: true,
      description: "Kỳ trả lương",
    },

    /**
     * Tiền ăn ca
     * Không có default.
     * Người dùng tự nhập.
     */
    mealRate: {
      type: Number,
      min: 0,
      description: "Mức tiền ăn ca do người dùng nhập",
    },

    /**
     * Các khoản thưởng
     */
    bonuses: {
      general: {
        type: Number,
        default: 0,
        min: 0,
      },

      performance: {
        type: Number,
        default: 0,
        min: 0,
      },

      responsibility: {
        type: Number,
        default: 0,
        min: 0,
        description: "Thưởng trách nhiệm",
      },
    },
  },
  { _id: false }
);

/**
 * =========================================================
 * EMPLOYEE
 * =========================================================
 */

const employeeSchema = new mongoose.Schema(
  {
    /**
     * =====================================================
     * THÔNG TIN CƠ BẢN
     * =====================================================
     */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    /**
     * =====================================================
     * ẢNH NHÂN VIÊN - CLOUDINARY
     * =====================================================
     */

    avatar: {
      url: {
        type: String,
        trim: true,
        description: "URL ảnh nhân viên trên Cloudinary",
      },

      publicId: {
        type: String,
        trim: true,
        description: "Public ID dùng để thay/xóa ảnh trên Cloudinary",
      },
    },

    /**
     * =====================================================
     * SƠ YẾU LÝ LỊCH / THÔNG TIN CÁ NHÂN
     * =====================================================
     */

    personalInfo: {
      type: personalInfoSchema,
      default: {},
    },

    /**
     * =====================================================
     * THÔNG TIN CÔNG VIỆC
     * =====================================================
     */

    workInfo: {
      type: workInfoSchema,
      default: {},
    },

    /**
     * =====================================================
     * THÔNG TIN HỢP ĐỒNG
     * =====================================================
     */

    contractInfo: {
      type: contractInfoSchema,
      default: {},
    },

    /**
     * =====================================================
     * LƯƠNG / BHXH / THUẾ / NGÂN HÀNG
     * =====================================================
     */

    salaryAndBenefits: {
      type: salaryAndBenefitsSchema,
      default: {},
    },

    /**
     * =====================================================
     * HỌC TẬP / ĐÀO TẠO
     * =====================================================
     */

    education: {
      type: [educationSchema],
      default: [],
    },

    /**
     * =====================================================
     * KINH NGHIỆM LÀM VIỆC
     * =====================================================

     */

    workExperience: {
      type: [workExperienceSchema],
      default: [],
    },

    /**
     * =====================================================
     * TRẠNG THÁI NHÂN VIÊN
     * =====================================================
     */

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "PROBATION",
        "ON_LEAVE",
        "RESIGNED",
        "TERMINATED",
      ],
      default: "ACTIVE",
    },

    /**
     * Ghi chú thêm
     */
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

/**
 * =========================================================
 * VIRTUAL: THỜI GIAN LÀM VIỆC
 * =========================================================
 */

employeeSchema.virtual("workingDuration").get(function () {
  return calculateWorkingDuration(
    this.workInfo?.startDate
  );
});

/**
 * =========================================================
 * VIRTUAL: TRẠNG THÁI HỢP ĐỒNG
 * =========================================================
 */

employeeSchema.virtual("currentContractStatus").get(function () {
  const startDate = this.contractInfo?.contractStartDate;
  const endDate = this.contractInfo?.contractEndDate;

  if (!startDate || !endDate) {
    return "NO_CONTRACT";
  }

  const now = new Date();

  if (now < startDate) {
    return "NOT_STARTED";
  }

  if (now > endDate) {
    return "EXPIRED";
  }

  return "ACTIVE";
});

/**
 * =========================================================
 * INDEXES
 * =========================================================
 */

employeeSchema.index({
  "personalInfo.idCardNumber": 1,
});

employeeSchema.index({
  email: 1,
});

employeeSchema.index({
  phone: 1,
});

employeeSchema.index({
  "workInfo.department": 1,
});

employeeSchema.index({
  "workInfo.employeeCode": 1,
});

employeeSchema.index({
  status: 1,
});

/**
 * =========================================================
 * EXPORT
 * =========================================================
 */

export const Employee = mongoose.model(
  "Employee",
  employeeSchema
);
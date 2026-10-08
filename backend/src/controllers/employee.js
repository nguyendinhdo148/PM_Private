import mongoose from "mongoose";

import { Employee } from "../models/employee.js";

import { v2 as cloudinary } from "cloudinary";

/**
 * =========================================================
 * HELPER
 * =========================================================
 */

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Lấy publicId ảnh hiện tại
 */
const getCurrentAvatarPublicId = (employee) => {
  return employee?.avatar?.publicId || null;
};

/**
 * =========================================================
 * CREATE EMPLOYEE
 * POST /api/employees
 * =========================================================
 */

export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      avatar,
      personalInfo,
      workInfo,
      contractInfo,
      salaryAndBenefits,
      education,
      workExperience,
      status,
      notes,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Họ và tên nhân viên là bắt buộc",
      });
    }

    /**
     * Kiểm tra email trùng
     */
    if (email?.trim()) {
      const existingEmail = await Employee.findOne({
        email: email.trim().toLowerCase(),
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email này đã được sử dụng",
        });
      }
    }

    /**
     * Kiểm tra số điện thoại trùng
     */
    if (phone?.trim()) {
      const existingPhone = await Employee.findOne({
        phone: phone.trim(),
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng",
        });
      }
    }

    /**
     * Kiểm tra CCCD trùng
     */
    const idCardNumber = personalInfo?.idCardNumber?.trim();

    if (idCardNumber) {
      const existingIdCard = await Employee.findOne({
        "personalInfo.idCardNumber": idCardNumber,
      });

      if (existingIdCard) {
        return res.status(400).json({
          success: false,
          message: "Số CCCD/CMND này đã tồn tại",
        });
      }
    }

    /**
     * Kiểm tra mã nhân viên trùng
     */
    const employeeCode = workInfo?.employeeCode?.trim();

    if (employeeCode) {
      const existingCode = await Employee.findOne({
        "workInfo.employeeCode": employeeCode,
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên này đã tồn tại",
        });
      }
    }

    const employee = await Employee.create({
      name: name.trim(),

      phone: phone?.trim() || undefined,

      email: email?.trim()?.toLowerCase() || undefined,

      avatar: avatar || undefined,

      personalInfo: personalInfo || {},

      workInfo: workInfo || {},

      contractInfo: contractInfo || {},

      salaryAndBenefits: salaryAndBenefits || {},

      education: Array.isArray(education)
        ? education
        : [],

      workExperience: Array.isArray(workExperience)
        ? workExperience
        : [],

      status: status || "ACTIVE",

      notes: notes?.trim() || undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Thêm nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error("createEmployee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * GET ALL EMPLOYEES
 * GET /api/employees
 * =========================================================
 *
 * Query hỗ trợ:
 *
 * ?search=nguyen
 * ?status=ACTIVE
 * ?department=FOH
 * ?page=1
 * ?limit=20
 *
 * Có thể kết hợp:
 *
 * /api/employees?search=nguyen&status=ACTIVE&department=FOH
 */

export const getEmployees = async (req, res) => {
  try {
    const {
      search,
      status,
      department,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    /**
     * Search
     */
    if (search?.trim()) {
      const keyword = search.trim();

      filter.$or = [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          "workInfo.employeeCode": {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          "personalInfo.idCardNumber": {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    /**
     * Status
     */
    if (status) {
      filter.status = status;
    }

    /**
     * Department
     */
    if (department?.trim()) {
      filter["workInfo.department"] = department.trim();
    }

    /**
     * Pagination
     */
    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip = (currentPage - 1) * perPage;

    /**
     * Sort
     */
    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(perPage),

      Employee.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      employees,

      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error("getEmployees error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * GET EMPLOYEE BY ID
 * GET /api/employees/:id
 * =========================================================
 */

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID nhân viên không hợp lệ",
      });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên",
      });
    }

    return res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error(
      "getEmployeeById error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * UPDATE EMPLOYEE
 * PUT /api/employees/:id
 * =========================================================
 */

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID nhân viên không hợp lệ",
      });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên",
      });
    }

    const {
      name,
      phone,
      email,
      avatar,
      personalInfo,
      workInfo,
      contractInfo,
      salaryAndBenefits,
      education,
      workExperience,
      status,
      notes,
    } = req.body;

    /**
     * =====================================================
     * CHECK DUPLICATE EMAIL
     * =====================================================
     */

    if (email !== undefined) {
      const normalizedEmail =
        email?.trim()?.toLowerCase();

      if (normalizedEmail) {
        const existingEmail =
          await Employee.findOne({
            email: normalizedEmail,
            _id: { $ne: id },
          });

        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message:
              "Email này đã được sử dụng bởi nhân viên khác",
          });
        }

        employee.email = normalizedEmail;
      } else {
        employee.email = undefined;
      }
    }

    /**
     * =====================================================
     * CHECK DUPLICATE PHONE
     * =====================================================
     */

    if (phone !== undefined) {
      const normalizedPhone = phone?.trim();

      if (normalizedPhone) {
        const existingPhone =
          await Employee.findOne({
            phone: normalizedPhone,
            _id: { $ne: id },
          });

        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message:
              "Số điện thoại này đã được sử dụng bởi nhân viên khác",
          });
        }

        employee.phone = normalizedPhone;
      } else {
        employee.phone = undefined;
      }
    }

    /**
     * =====================================================
     * CHECK DUPLICATE CCCD
     * =====================================================
     */

    if (
      personalInfo &&
      personalInfo.idCardNumber !== undefined
    ) {
      const idCardNumber =
        personalInfo.idCardNumber?.trim();

      if (idCardNumber) {
        const existingIdCard =
          await Employee.findOne({
            "personalInfo.idCardNumber":
              idCardNumber,
            _id: { $ne: id },
          });

        if (existingIdCard) {
          return res.status(400).json({
            success: false,
            message:
              "Số CCCD/CMND này đã được sử dụng bởi nhân viên khác",
          });
        }
      }
    }

    /**
     * =====================================================
     * CHECK DUPLICATE EMPLOYEE CODE
     * =====================================================
     */

    if (
      workInfo &&
      workInfo.employeeCode !== undefined
    ) {
      const employeeCode =
        workInfo.employeeCode?.trim();

      if (employeeCode) {
        const existingCode =
          await Employee.findOne({
            "workInfo.employeeCode":
              employeeCode,
            _id: { $ne: id },
          });

        if (existingCode) {
          return res.status(400).json({
            success: false,
            message:
              "Mã nhân viên này đã được sử dụng bởi nhân viên khác",
          });
        }
      }
    }

    /**
     * =====================================================
     * UPDATE BASIC
     * =====================================================
     */

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Họ và tên nhân viên không được để trống",
        });
      }

      employee.name = name.trim();
    }

    /**
     * =====================================================
     * UPDATE AVATAR
     * =====================================================
     */

    if (avatar !== undefined) {
      employee.avatar = avatar || undefined;
    }

    /**
     * =====================================================
     * MERGE NESTED OBJECTS
     * =====================================================
     */

    if (personalInfo) {
      employee.personalInfo = {
        ...(employee.personalInfo?.toObject?.() ||
          employee.personalInfo ||
          {}),
        ...personalInfo,
      };
    }

    if (workInfo) {
      employee.workInfo = {
        ...(employee.workInfo?.toObject?.() ||
          employee.workInfo ||
          {}),
        ...workInfo,
      };
    }

    if (contractInfo) {
      employee.contractInfo = {
        ...(employee.contractInfo?.toObject?.() ||
          employee.contractInfo ||
          {}),
        ...contractInfo,
      };
    }

    if (salaryAndBenefits) {
      employee.salaryAndBenefits = {
        ...(employee.salaryAndBenefits?.toObject?.() ||
          employee.salaryAndBenefits ||
          {}),
        ...salaryAndBenefits,
      };
    }

    /**
     * Array fields
     */

    if (education !== undefined) {
      employee.education =
        Array.isArray(education)
          ? education
          : [];
    }

    if (workExperience !== undefined) {
      employee.workExperience =
        Array.isArray(workExperience)
          ? workExperience
          : [];
    }

    /**
     * =====================================================
     * STATUS
     * =====================================================
     */

    if (status !== undefined) {
      employee.status = status;
    }

    /**
     * =====================================================
     * NOTES
     * =====================================================
     */

    if (notes !== undefined) {
      employee.notes =
        notes?.trim() || undefined;
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error(
      "updateEmployee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * DELETE EMPLOYEE
 * DELETE /api/employees/:id
 * =========================================================
 *
 * Xóa cứng employee.
 *
 * Lưu ý:
 * Hiện tại chưa xóa ảnh Cloudinary vì dữ liệu
 * tài chính sau này sẽ liên kết với Employee.
 */

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID nhân viên không hợp lệ",
      });
    }

    const employee =
      await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên",
      });
    }

    await Employee.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa nhân viên thành công",
    });
  } catch (error) {
    console.error(
      "deleteEmployee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể xóa nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * UPDATE EMPLOYEE STATUS
 * PATCH /api/employees/:id/status
 * =========================================================
 */

export const updateEmployeeStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID nhân viên không hợp lệ",
      });
    }

    const allowedStatuses = [
      "ACTIVE",
      "PROBATION",
      "ON_LEAVE",
      "RESIGNED",
      "TERMINATED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái nhân viên không hợp lệ",
      });
    }

    const employee =
      await Employee.findByIdAndUpdate(
        id,
        { status },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật trạng thái nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error(
      "updateEmployeeStatus error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể cập nhật trạng thái nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * DELETE EMPLOYEE AVATAR
 * DELETE /api/employees/:id/avatar
 * =========================================================
 */

export const deleteEmployeeAvatar = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID nhân viên không hợp lệ",
      });
    }

    const employee =
      await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên",
      });
    }

    const publicId =
      getCurrentAvatarPublicId(employee);

    /**
     * Nếu có publicId thì xóa trên Cloudinary
     */
    if (publicId && cloudinary) {
      try {
        await cloudinary.uploader.destroy(
          publicId
        );
      } catch (cloudinaryError) {
        console.error(
          "Cloudinary delete error:",
          cloudinaryError
        );
      }
    }

    employee.avatar = undefined;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh nhân viên thành công",
      employee,
    });
  } catch (error) {
    console.error(
      "deleteEmployeeAvatar error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Không thể xóa ảnh nhân viên",
      error: error.message,
    });
  }
};

/**
 * =========================================================
 * UPLOAD EMPLOYEE AVATAR
 * POST /api/employees/upload-avatar
 * =========================================================
 */
export const uploadEmployeeAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "employees/avatars",
          resource_type: "image",
        },
        (error, uploaded) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(uploaded);
        },
      );

      uploadStream.end(req.file.buffer);
    });

    return res.status(200).json({
      success: true,
      message: "Upload ảnh nhân viên thành công",
      avatar: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error("uploadEmployeeAvatar error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể upload ảnh nhân viên",
      error: error.message,
    });
  }
};
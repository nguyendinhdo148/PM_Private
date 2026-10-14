
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";

const getUserId = (req) =>
  req.user?._id || req.user?.id || req.id;

const getRole = (req) =>
  String(req.user?.role || "").toLowerCase();

const isAdmin = (req) =>
  ["admin", "superadmin"].includes(getRole(req));

const validId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description = "",
      language = "zh-CN",
      level = "beginner",
      coverImage = "",
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên chương trình.",
      });
    }

    if (!["zh-CN", "en"].includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Ngôn ngữ không hợp lệ.",
      });
    }

    const course = await Course.create({
      title: title.trim(),
      description,
      language,
      level,
      coverImage,
      createdBy: getUserId(req),
    });

    return res.status(201).json({
      success: true,
      message: "Tạo chương trình học thành công.",
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo chương trình học.",
    });
  }
};

export const getCourses = async (req, res) => {
  try {
    const filter = {};

    if (!isAdmin(req)) {
      filter.$or = [
        { status: "published" },
        { createdBy: getUserId(req), status: "draft" },
      ];
    }

    if (req.query.language &&
        ["zh-CN", "en"].includes(req.query.language)) {
      filter.language = req.query.language;
    }

    const courses = await Course.find(filter)
      .populate({
        path: "lessons",
        select: "title topic language level status estimatedMinutes",
      })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy chương trình học.",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID chương trình không hợp lệ.",
      });
    }

    const course = await Course.findById(id).populate({
      path: "lessons",
      select: "title description topic language level status estimatedMinutes",
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình học.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (
      course.status !== "published" &&
      !owner &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem chương trình này.",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết chương trình.",
    });
  }
};

export const addLessonToCourse = async (req, res) => {
  try {
    const { id, lessonId } = req.params;

    if (!validId(id) || !validId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }

    const course = await Course.findById(id);
    const lesson = await Lesson.findById(lessonId);

    if (!course || !lesson) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình hoặc bài học.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (!owner && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa chương trình này.",
      });
    }

    if (course.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được sửa chương trình đang ở trạng thái nháp.",
      });
    }

    if (
      String(course.createdBy) !== String(lesson.createdBy) &&
      !isAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không thể thêm bài học của người khác.",
      });
    }

    if (
      lesson.status !== "published" &&
      !isAdmin(req)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bài học phải được xuất bản trước khi thêm vào chương trình.",
      });
    }

    if (course.language !== lesson.language) {
      return res.status(400).json({
        success: false,
        message: "Ngôn ngữ bài học không khớp chương trình.",
      });
    }

    if (!course.lessons.some(
      (item) => String(item) === String(lessonId)
    )) {
      course.lessons.push(lessonId);
      await course.save();
    }

    return res.status(200).json({
      success: true,
      message: "Đã thêm bài học vào chương trình.",
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm bài học.",
    });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID chương trình không hợp lệ.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (!owner && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa chương trình này.",
      });
    }

    if (course.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được sửa chương trình nháp.",
      });
    }

    for (const field of [
      "title",
      "description",
      "level",
      "coverImage",
    ]) {
      if (req.body[field] !== undefined) {
        course.set(field, req.body[field]);
      }
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật chương trình thành công.",
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật chương trình.",
    });
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID chương trình không hợp lệ.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (!owner && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xuất bản chương trình.",
      });
    }

    if (!course.title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Chương trình cần có tên.",
      });
    }

    course.status = "published";
    course.publishedAt = new Date();
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Xuất bản chương trình thành công.",
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể xuất bản chương trình.",
    });
  }
};

export const removeLessonFromCourse = async (req, res) => {
  try {
    const { id, lessonId } = req.params;

    if (!validId(id) || !validId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (!owner && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa chương trình này.",
      });
    }

    if (course.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được sửa chương trình nháp.",
      });
    }

    course.lessons = course.lessons.filter(
      (item) => String(item) !== String(lessonId)
    );

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Đã gỡ bài học khỏi chương trình.",
      course,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể gỡ bài học.",
    });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID chương trình không hợp lệ.",
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chương trình.",
      });
    }

    const owner =
      String(course.createdBy) === String(getUserId(req));

    if (!owner && !isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa chương trình.",
      });
    }

    if (course.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được xóa chương trình nháp.",
      });
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Đã xóa chương trình học.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa chương trình.",
    });
  }
};

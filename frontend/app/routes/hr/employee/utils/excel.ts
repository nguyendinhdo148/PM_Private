import * as XLSX from "xlsx";
import type { Employee } from "../types";
import {
  GENDER_OPTIONS,
  STATUS_OPTIONS,
} from "../constants";

const formatDate = (date?: string) => {
  if (!date) return "-";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "-";

  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();

  return `${day}/${month}/${year}`;
};

const getStatusLabel = (status?: Employee["status"]) =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label ||
  status ||
  "-";

const getMaritalStatusLabel = (status?: string) => {
  if (!status) return "";

  const normalized = status.trim().toLowerCase();
  const labels: Record<string, string> = {
    single: "Độc thân",
    unmarried: "Độc thân",
    married: "Đã kết hôn",
    divorced: "Đã ly hôn",
    widowed: "Góa",
    separated: "Ly thân",
    "độc thân": "Độc thân",
    "đã kết hôn": "Đã kết hôn",
    "ly hôn": "Đã ly hôn",
    "đã ly hôn": "Đã ly hôn",
    "ly thân": "Ly thân",
    "góa": "Góa",
  };

  return labels[normalized] || status;
};

const getOrganizationLevelLabel = (level?: string) => {
  if (!level) return "";

  const normalized = level.trim().toLowerCase();
  const labels: Record<string, string> = {
    company: "Công ty",
    head_office: "Trụ sở chính",
    branch: "Chi nhánh",
    department: "Phòng ban",
    team: "Tổ / Nhóm",
    store: "Cửa hàng",
    "công ty": "Công ty",
    "trụ sở chính": "Trụ sở chính",
    "chi nhánh": "Chi nhánh",
    "phòng ban": "Phòng ban",
    "tổ / nhóm": "Tổ / Nhóm",
    "cửa hàng": "Cửa hàng",
  };

  return labels[normalized] || level;
};

export async function exportEmployeesToExcel(
  employees: Employee[],
  loadAllEmployees?: () => Promise<Employee[]>,
) {
  const allEmployees = loadAllEmployees
    ? await loadAllEmployees()
    : employees;

  const employeeRows = allEmployees.map((employee, index) => ({
    STT: index + 1,
    "Mã nhân viên": employee.workInfo?.employeeCode || "",
    "Họ và tên": employee.name || "",
    "Giới tính":
      GENDER_OPTIONS.find(
        (item) => item.value === employee.personalInfo?.gender,
      )?.label || "",
    "Ngày sinh": formatDate(employee.personalInfo?.dateOfBirth),
    "Nơi sinh": employee.personalInfo?.placeOfBirth || "",
    "Quê quán": employee.personalInfo?.hometown || "",
    "Quốc tịch": employee.personalInfo?.nationality || "",
    "Dân tộc": employee.personalInfo?.ethnicity || "",
    "Tình trạng hôn nhân": getMaritalStatusLabel(
      employee.personalInfo?.maritalStatus,
    ),
    "Số điện thoại": employee.phone || "",
    Email: employee.email || "",
    CCCD: employee.personalInfo?.idCardNumber || "",
    "Ngày cấp CCCD": formatDate(employee.personalInfo?.idCardIssueDate),
    "Nơi cấp CCCD": employee.personalInfo?.idCardIssuePlace || "",
    "Phòng ban": employee.workInfo?.department || "",
    "Cấp tổ chức": getOrganizationLevelLabel(
      employee.workInfo?.organizationLevel,
    ),
    "Chức danh": employee.workInfo?.position || "",
    "Quản lý trực tiếp": employee.workInfo?.managerId || "",
    "Ngày nhận việc": formatDate(employee.workInfo?.startDate),
    "Trạng thái": getStatusLabel(employee.status),
    "Số hợp đồng": employee.contractInfo?.contractNumber || "",
    "Loại hợp đồng": employee.contractInfo?.contractType || "",
    "Ngày bắt đầu HĐ": formatDate(employee.contractInfo?.contractStartDate),
    "Ngày kết thúc HĐ": formatDate(employee.contractInfo?.contractEndDate),
    "Ngày bắt đầu thử việc": formatDate(employee.contractInfo?.probationStartDate),
    "Ngày kết thúc thử việc": formatDate(employee.contractInfo?.probationEndDate),
    "Ghi chú hợp đồng": employee.contractInfo?.notes || "",
    "Lương cơ bản": employee.salaryAndBenefits?.baseSalary || 0,
    "Lương đóng BH": employee.salaryAndBenefits?.insuranceSalary || 0,
    "Hình thức thanh toán": employee.salaryAndBenefits?.paymentMethod || "",
    "Kỳ thanh toán": employee.salaryAndBenefits?.paymentPeriod || "",
    "Số BHXH": employee.salaryAndBenefits?.socialInsuranceNumber || "",
    "Mã số thuế": employee.salaryAndBenefits?.taxCode || "",
    "Người phụ thuộc": employee.salaryAndBenefits?.dependents || 0,
    "Tiền ăn ca": employee.salaryAndBenefits?.mealRate ?? "",
    "Ngân hàng": employee.salaryAndBenefits?.bankName || "",
    "Chi nhánh": employee.salaryAndBenefits?.bankBranch || "",
    "Số tài khoản": employee.salaryAndBenefits?.bankAccountNumber || "",
    "Người liên hệ khẩn cấp":
      employee.personalInfo?.emergencyContact?.name || "",
    "Quan hệ": employee.personalInfo?.emergencyContact?.relationship || "",
    "SĐT khẩn cấp": employee.personalInfo?.emergencyContact?.phone || "",
    "Địa chỉ liên hệ khẩn cấp":
      employee.personalInfo?.emergencyContact?.address || "",
    "Địa chỉ hiện tại": employee.personalInfo?.currentAddress || "",
    "Địa chỉ thường trú": employee.personalInfo?.permanentAddress || "",
    "Ghi chú nhân viên": employee.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(employeeRows);
  worksheet["!cols"] = Object.keys(employeeRows[0] || {}).map((header) => {
    const widthByHeader: Record<string, number> = {
      STT: 6,
      "Mã nhân viên": 15,
      "Họ và tên": 25,
      "Giới tính": 12,
      "Ngày sinh": 14,
      "Nơi sinh": 25,
      "Quê quán": 30,
      "Quốc tịch": 18,
      "Dân tộc": 16,
      "Tình trạng hôn nhân": 22,
      "Số điện thoại": 15,
      Email: 30,
      CCCD: 18,
      "Ngày cấp CCCD": 15,
      "Nơi cấp CCCD": 25,
      "Phòng ban": 20,
      "Cấp tổ chức": 20,
      "Chức danh": 25,
      "Quản lý trực tiếp": 25,
      "Ngày nhận việc": 15,
      "Trạng thái": 18,
      "Số hợp đồng": 20,
      "Loại hợp đồng": 20,
      "Ngày bắt đầu HĐ": 18,
      "Ngày kết thúc HĐ": 18,
      "Ngày bắt đầu thử việc": 20,
      "Ngày kết thúc thử việc": 20,
      "Ghi chú hợp đồng": 30,
      "Lương cơ bản": 18,
      "Lương đóng BH": 18,
      "Thưởng": 18,
      "Thưởng hiệu suất": 20,
      "Phụ cấp trách nhiệm": 22,
      "Hình thức thanh toán": 22,
      "Kỳ thanh toán": 18,
      "Số BHXH": 18,
      "Mã số thuế": 18,
      "Người phụ thuộc": 18,
      "Tiền ăn ca": 18,
      "Ngân hàng": 25,
      "Chi nhánh": 25,
      "Số tài khoản": 25,
      "Người liên hệ khẩn cấp": 25,
      "Quan hệ": 18,
      "SĐT khẩn cấp": 18,
      "Địa chỉ liên hệ khẩn cấp": 35,
      "Địa chỉ hiện tại": 35,
      "Địa chỉ thường trú": 35,
      "Ghi chú nhân viên": 35,
    };
    return { wch: widthByHeader[header] || 20 };
  });

  const familyRows = allEmployees.flatMap((employee) =>
    (employee.personalInfo?.familyMembers || []).map((member) => ({
      "Mã nhân viên": employee.workInfo?.employeeCode || "",
      "Họ và tên": employee.name || "",
      "Tên thành viên": member.name || "",
      "Quan hệ": member.relationship || "",
      "Năm sinh": member.birthYear || "",
      "Nghề nghiệp": member.occupation || "",
    })),
  );

  const familySheet = XLSX.utils.json_to_sheet(
    familyRows.length
      ? familyRows
      : [{
          "Mã nhân viên": "", "Họ và tên": "", "Tên thành viên": "",
          "Quan hệ": "", "Năm sinh": "", "Nghề nghiệp": "",
        }],
  );

  const educationRows = allEmployees.flatMap((employee) =>
    (employee.education || []).map((item) => ({
      "Mã nhân viên": employee.workInfo?.employeeCode || "",
      "Họ và tên": employee.name || "",
      "Từ ngày": formatDate(item.fromDate),
      "Đến ngày": formatDate(item.toDate),
      "Trường": item.school || "",
      "Chuyên ngành / chứng chỉ": item.majorOrCertificate || "",
      "Bằng cấp / chứng chỉ": item.degreeOrCertificate || "",
    })),
  );

  const educationSheet = XLSX.utils.json_to_sheet(
    educationRows.length
      ? educationRows
      : [{
          "Mã nhân viên": "", "Họ và tên": "", "Từ ngày": "", "Đến ngày": "",
          "Trường": "", "Chuyên ngành / chứng chỉ": "", "Bằng cấp / chứng chỉ": "",
        }],
  );

  const experienceRows = allEmployees.flatMap((employee) =>
    (employee.workExperience || []).map((item) => ({
      "Mã nhân viên": employee.workInfo?.employeeCode || "",
      "Họ và tên": employee.name || "",
      "Từ ngày": formatDate(item.fromDate),
      "Đến ngày": formatDate(item.toDate),
      "Công ty": item.company || "",
      "Chức vụ": item.position || "",
      "Loại hình": item.employmentType || "",
      "Nhiệm vụ": item.responsibilities || "",
    })),
  );

  const experienceSheet = XLSX.utils.json_to_sheet(
    experienceRows.length
      ? experienceRows
      : [{
          "Mã nhân viên": "", "Họ và tên": "", "Từ ngày": "", "Đến ngày": "",
          "Công ty": "", "Chức vụ": "", "Loại hình": "", "Nhiệm vụ": "",
        }],
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "NhanSu");
  XLSX.utils.book_append_sheet(workbook, familySheet, "GiaDinh");
  XLSX.utils.book_append_sheet(workbook, educationSheet, "HocTap");
  XLSX.utils.book_append_sheet(workbook, experienceSheet, "KinhNghiem");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `BaoCaoNhanSu_${date}.xlsx`);
  return allEmployees.length;
}

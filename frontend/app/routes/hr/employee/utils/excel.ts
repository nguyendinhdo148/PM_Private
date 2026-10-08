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
  return value.toLocaleDateString("vi-VN");
};

const getStatusLabel = (status?: Employee["status"]) =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label ||
  status ||
  "-";

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
    "Số điện thoại": employee.phone || "",
    Email: employee.email || "",
    CCCD: employee.personalInfo?.idCardNumber || "",
    "Ngày cấp CCCD": formatDate(employee.personalInfo?.idCardIssueDate),
    "Nơi cấp CCCD": employee.personalInfo?.idCardIssuePlace || "",
    "Phòng ban": employee.workInfo?.department || "",
    "Chức danh": employee.workInfo?.position || "",
    "Ngày nhận việc": formatDate(employee.workInfo?.startDate),
    "Trạng thái": getStatusLabel(employee.status),
    "Loại hợp đồng": employee.contractInfo?.contractType || "",
    "Ngày bắt đầu HĐ": formatDate(employee.contractInfo?.contractStartDate),
    "Ngày kết thúc HĐ": formatDate(employee.contractInfo?.contractEndDate),
    "Lương cơ bản": employee.salaryAndBenefits?.baseSalary || 0,
    "Lương đóng BH": employee.salaryAndBenefits?.insuranceSalary || 0,
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
    "Địa chỉ hiện tại": employee.personalInfo?.currentAddress || "",
    "Địa chỉ thường trú": employee.personalInfo?.permanentAddress || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(employeeRows);
  worksheet["!cols"] = [
    { wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 14 },
    { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 25 },
    { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 20 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
    { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 35 }, { wch: 35 },
  ];

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

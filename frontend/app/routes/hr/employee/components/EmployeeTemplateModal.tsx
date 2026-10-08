import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from "lucide-react";
import type { Employee } from "../types";
import { exportEmployeeTemplateToExcel } from "../utils/employee-templates/excel-template";

type TemplateType =
  | "EMPLOYEE_INFO"
  | "RESUME"
  | "CONTRACT"
  | "SALARY_INSURANCE"
  | "EMPLOYEE_FULL";

type TemplateOption = {
  value: TemplateType;
  label: string;
  description: string;
};

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    value: "EMPLOYEE_INFO",
    label: "Phiếu thông tin nhân sự",
    description:
      "Thông tin cá nhân, liên hệ, công việc và người liên hệ khẩn cấp.",
  },
  {
    value: "RESUME",
    label: "Sơ yếu lý lịch",
    description:
      "Thông tin cá nhân, CCCD, quê quán, địa chỉ, gia đình và quá trình học tập.",
  },
  {
    value: "CONTRACT",
    label: "Hợp đồng lao động",
    description:
      "Thông tin nhân viên và các thông tin liên quan đến hợp đồng lao động.",
  },
  {
    value: "SALARY_INSURANCE",
    label: "Lương & bảo hiểm",
    description:
      "Thông tin lương, bảo hiểm, thuế, phụ cấp, ngân hàng và phương thức thanh toán.",
  },
  {
    value: "EMPLOYEE_FULL",
    label: "Hồ sơ nhân sự tổng hợp",
    description:
      "Tổng hợp toàn bộ thông tin nhân sự thành một biểu mẫu.",
  },
];

function formatDate(date?: string) {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("vi-VN");
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toLocaleString("vi-VN")} ₫`;
}

function getTemplateTitle(template: TemplateType) {
  return (
    TEMPLATE_OPTIONS.find((item) => item.value === template)?.label ||
    "Biểu mẫu nhân sự"
  );
}

function getValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}

function printEmployeeTemplate(
  employee: Employee,
  template: TemplateType,
) {
  const title = getTemplateTitle(template);

  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=800",
  );

  if (!printWindow) {
    window.alert(
      "Không thể mở cửa sổ in. Vui lòng cho phép popup trên trình duyệt.",
    );

    return;
  }

  const fullName = getValue(employee.name);
  const employeeCode = getValue(
    employee.workInfo?.employeeCode,
  );

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />

  <title>${title} - ${fullName}</title>

  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #111827;
      background: white;
      font-size: 13px;
      line-height: 1.5;
    }

    .page {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 18px;
    }

    .company {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .title {
      font-size: 19px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0;
    }

    .subtitle {
      margin-top: 5px;
      color: #4b5563;
      font-size: 12px;
    }

    .section {
      margin-top: 16px;
      break-inside: avoid;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 7px 9px;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    td,
    th {
      border: 1px solid #d1d5db;
      padding: 7px 8px;
      vertical-align: top;
      word-break: break-word;
    }

    th {
      background: #f9fafb;
      font-weight: 700;
      text-align: left;
    }

    .label {
      width: 25%;
      font-weight: 600;
      background: #f9fafb;
    }

    .value {
      width: 25%;
    }

    .full {
      width: 75%;
    }

    .signature {
      display: flex;
      justify-content: space-between;
      margin-top: 45px;
      text-align: center;
    }

    .signature-item {
      width: 40%;
    }

    .signature-space {
      height: 65px;
    }

    .photo {
      width: 30mm;
      height: 40mm;
      border: 1px solid #9ca3af;
      object-fit: cover;
    }

    .photo-wrapper {
      text-align: center;
      padding: 8px;
      vertical-align: middle;
    }

    .muted {
      color: #6b7280;
    }

    .page-break {
      page-break-before: always;
    }

    @media print {
      body {
        background: white;
      }

      .page {
        max-width: none;
      }
    }
  </style>
</head>

<body>
  <div class="page">

    <div class="header">
      <div class="company">
        THÔNG TIN NHÂN SỰ
      </div>

      <h1 class="title">
        ${title}
      </h1>

      <div class="subtitle">
        Mã nhân viên: ${employeeCode}
      </div>
    </div>

    ${buildPrintContent(employee, template)}

  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function buildPrintContent(
  employee: Employee,
  template: TemplateType,
) {
  const personal = employee.personalInfo;
  const work = employee.workInfo;
  const contract = employee.contractInfo;
  const salary = employee.salaryAndBenefits;

  if (template === "EMPLOYEE_INFO") {
    return `
      <div class="section">
        <div class="section-title">
          I. Thông tin cơ bản
        </div>

        <table>
          <tr>
            <td class="label">Họ và tên</td>
            <td class="value">${getValue(employee.name)}</td>

            <td
              class="photo-wrapper"
              rowspan="5"
            >
              ${
                employee.avatar?.url
                  ? `<img
                      src="${employee.avatar.url}"
                      class="photo"
                      alt="Ảnh nhân viên"
                    />`
                  : `<div class="muted">
                      Không có ảnh
                    </div>`
              }
            </td>
          </tr>

          <tr>
            <td class="label">Mã nhân viên</td>
            <td>${getValue(work?.employeeCode)}</td>
          </tr>

          <tr>
            <td class="label">Ngày sinh</td>
            <td>${formatDate(personal?.dateOfBirth)}</td>
          </tr>

          <tr>
            <td class="label">Giới tính</td>
            <td>${getValue(personal?.gender)}</td>
          </tr>

          <tr>
            <td class="label">Tình trạng hôn nhân</td>
            <td>${getValue(personal?.maritalStatus)}</td>
          </tr>

          <tr>
            <td class="label">Số điện thoại</td>
            <td>${getValue(employee.phone)}</td>

            <td class="label">Email</td>
            <td>${getValue(employee.email)}</td>
          </tr>

          <tr>
            <td class="label">CCCD</td>
            <td>${getValue(personal?.idCardNumber)}</td>

            <td class="label">Ngày cấp</td>
            <td>${formatDate(personal?.idCardIssueDate)}</td>
          </tr>

          <tr>
            <td class="label">Nơi sinh</td>
            <td colspan="3">
              ${getValue(personal?.placeOfBirth)}
            </td>
          </tr>

          <tr>
            <td class="label">Quê quán</td>
            <td colspan="3">
              ${getValue(personal?.hometown)}
            </td>
          </tr>

          <tr>
            <td class="label">Địa chỉ thường trú</td>
            <td colspan="3">
              ${getValue(personal?.permanentAddress)}
            </td>
          </tr>

          <tr>
            <td class="label">Địa chỉ hiện tại</td>
            <td colspan="3">
              ${getValue(personal?.currentAddress)}
            </td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          II. Thông tin công việc
        </div>

        <table>
          <tr>
            <td class="label">Phòng ban</td>
            <td>${getValue(work?.department)}</td>

            <td class="label">Chức vụ</td>
            <td>${getValue(work?.position)}</td>
          </tr>

          <tr>
            <td class="label">Ngày nhận việc</td>
            <td>${formatDate(work?.startDate)}</td>

            <td class="label">Trạng thái</td>
            <td>${getValue(employee.status)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          III. Người liên hệ khẩn cấp
        </div>

        <table>
          <tr>
            <td class="label">Họ tên</td>
            <td>${getValue(personal?.emergencyContact?.name)}</td>

            <td class="label">Quan hệ</td>
            <td>
              ${getValue(
                personal?.emergencyContact?.relationship,
              )}
            </td>
          </tr>

          <tr>
            <td class="label">Số điện thoại</td>
            <td>
              ${getValue(
                personal?.emergencyContact?.phone,
              )}
            </td>

            <td class="label">Địa chỉ</td>
            <td>
              ${getValue(
                personal?.emergencyContact?.address,
              )}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  if (template === "RESUME") {
    return `
      <div class="section">
        <div class="section-title">
          I. Thông tin cá nhân
        </div>

        <table>
          <tr>
            <td class="label">Họ và tên</td>
            <td>${getValue(employee.name)}</td>

            <td class="label">Giới tính</td>
            <td>${getValue(personal?.gender)}</td>
          </tr>

          <tr>
            <td class="label">Ngày sinh</td>
            <td>${formatDate(personal?.dateOfBirth)}</td>

            <td class="label">Quốc tịch</td>
            <td>${getValue(personal?.nationality)}</td>
          </tr>

          <tr>
            <td class="label">Dân tộc</td>
            <td>${getValue(personal?.ethnicity)}</td>

            <td class="label">Tình trạng hôn nhân</td>
            <td>${getValue(personal?.maritalStatus)}</td>
          </tr>

          <tr>
            <td class="label">Nơi sinh</td>
            <td colspan="3">
              ${getValue(personal?.placeOfBirth)}
            </td>
          </tr>

          <tr>
            <td class="label">Quê quán</td>
            <td colspan="3">
              ${getValue(personal?.hometown)}
            </td>
          </tr>

          <tr>
            <td class="label">CCCD</td>
            <td>${getValue(personal?.idCardNumber)}</td>

            <td class="label">Ngày cấp</td>
            <td>${formatDate(personal?.idCardIssueDate)}</td>
          </tr>

          <tr>
            <td class="label">Nơi cấp CCCD</td>
            <td colspan="3">
              ${getValue(personal?.idCardIssuePlace)}
            </td>
          </tr>

          <tr>
            <td class="label">Địa chỉ thường trú</td>
            <td colspan="3">
              ${getValue(personal?.permanentAddress)}
            </td>
          </tr>

          <tr>
            <td class="label">Địa chỉ hiện tại</td>
            <td colspan="3">
              ${getValue(personal?.currentAddress)}
            </td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          II. Thông tin gia đình
        </div>

        ${
          personal?.familyMembers?.length
            ? `
              <table>
                <tr>
                  <th>Họ tên</th>
                  <th>Quan hệ</th>
                  <th>Năm sinh</th>
                  <th>Nghề nghiệp</th>
                </tr>

                ${personal.familyMembers
                  .map(
                    (member) => `
                      <tr>
                        <td>${getValue(member.name)}</td>
                        <td>${getValue(member.relationship)}</td>
                        <td>${getValue(member.birthYear)}</td>
                        <td>${getValue(member.occupation)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </table>
            `
            : `
              <table>
                <tr>
                  <td class="muted">
                    Chưa có thông tin gia đình.
                  </td>
                </tr>
              </table>
            `
        }
      </div>

      <div class="section">
        <div class="section-title">
          III. Quá trình học tập
        </div>

        ${
          employee.education?.length
            ? `
              <table>
                <tr>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th>Trường</th>
                  <th>Chuyên ngành</th>
                  <th>Bằng cấp</th>
                </tr>

                ${employee.education
                  .map(
                    (item) => `
                      <tr>
                        <td>${formatDate(item.fromDate)}</td>
                        <td>${formatDate(item.toDate)}</td>
                        <td>${getValue(item.school)}</td>
                        <td>${getValue(item.majorOrCertificate)}</td>
                        <td>${getValue(item.degreeOrCertificate)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </table>
            `
            : `
              <table>
                <tr>
                  <td class="muted">
                    Chưa có thông tin học tập.
                  </td>
                </tr>
              </table>
            `
        }
      </div>

      <div class="section">
        <div class="section-title">
          IV. Quá trình công tác
        </div>

        ${
          employee.workExperience?.length
            ? `
              <table>
                <tr>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th>Công ty</th>
                  <th>Chức vụ</th>
                  <th>Hình thức</th>
                </tr>

                ${employee.workExperience
                  .map(
                    (item) => `
                      <tr>
                        <td>${formatDate(item.fromDate)}</td>
                        <td>${formatDate(item.toDate)}</td>
                        <td>${getValue(item.company)}</td>
                        <td>${getValue(item.position)}</td>
                        <td>${getValue(item.employmentType)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </table>
            `
            : `
              <table>
                <tr>
                  <td class="muted">
                    Chưa có thông tin kinh nghiệm.
                  </td>
                </tr>
              </table>
            `
        }
      </div>
    `;
  }

  if (template === "CONTRACT") {
    return `
      <div class="section">
        <div class="section-title">
          I. Thông tin nhân viên
        </div>

        <table>
          <tr>
            <td class="label">Họ và tên</td>
            <td>${getValue(employee.name)}</td>

            <td class="label">Mã nhân viên</td>
            <td>${getValue(work?.employeeCode)}</td>
          </tr>

          <tr>
            <td class="label">Phòng ban</td>
            <td>${getValue(work?.department)}</td>

            <td class="label">Chức vụ</td>
            <td>${getValue(work?.position)}</td>
          </tr>

          <tr>
            <td class="label">Ngày nhận việc</td>
            <td>${formatDate(work?.startDate)}</td>

            <td class="label">Số điện thoại</td>
            <td>${getValue(employee.phone)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          II. Thông tin hợp đồng
        </div>

        <table>
          <tr>
            <td class="label">Số hợp đồng</td>
            <td>${getValue(contract?.contractNumber)}</td>

            <td class="label">Loại hợp đồng</td>
            <td>${getValue(contract?.contractType)}</td>
          </tr>

          <tr>
            <td class="label">Ngày bắt đầu</td>
            <td>${formatDate(contract?.contractStartDate)}</td>

            <td class="label">Ngày kết thúc</td>
            <td>${formatDate(contract?.contractEndDate)}</td>
          </tr>

          <tr>
            <td class="label">Bắt đầu thử việc</td>
            <td>${formatDate(contract?.probationStartDate)}</td>

            <td class="label">Kết thúc thử việc</td>
            <td>${formatDate(contract?.probationEndDate)}</td>
          </tr>

          <tr>
            <td class="label">Ghi chú</td>
            <td colspan="3">
              ${getValue(contract?.notes)}
            </td>
          </tr>
        </table>
      </div>

      <div class="signature">
        <div class="signature-item">
          Người lao động

          <div class="signature-space"></div>

          <strong>${getValue(employee.name)}</strong>
        </div>

        <div class="signature-item">
          Đại diện công ty

          <div class="signature-space"></div>

          <strong>________________</strong>
        </div>
      </div>
    `;
  }

  if (template === "SALARY_INSURANCE") {
    return `
      <div class="section">
        <div class="section-title">
          I. Thông tin nhân viên
        </div>

        <table>
          <tr>
            <td class="label">Họ và tên</td>
            <td>${getValue(employee.name)}</td>

            <td class="label">Mã nhân viên</td>
            <td>${getValue(work?.employeeCode)}</td>
          </tr>

          <tr>
            <td class="label">Phòng ban</td>
            <td>${getValue(work?.department)}</td>

            <td class="label">Chức vụ</td>
            <td>${getValue(work?.position)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          II. Lương & bảo hiểm
        </div>

        <table>
          <tr>
            <td class="label">Lương cơ bản</td>
            <td>${formatMoney(salary?.baseSalary)}</td>

            <td class="label">Lương đóng BH</td>
            <td>${formatMoney(salary?.insuranceSalary)}</td>
          </tr>

          <tr>
            <td class="label">Số BHXH</td>
            <td>${getValue(salary?.socialInsuranceNumber)}</td>

            <td class="label">Mã số thuế</td>
            <td>${getValue(salary?.taxCode)}</td>
          </tr>

          <tr>
            <td class="label">Người phụ thuộc</td>
            <td>${getValue(salary?.dependents)}</td>

            <td class="label">Tiền ăn</td>
            <td>${formatMoney(salary?.mealRate)}</td>
          </tr>

          <tr>
            <td class="label">Thưởng chung</td>
            <td>${formatMoney(salary?.bonuses?.general)}</td>

            <td class="label">Thưởng hiệu suất</td>
            <td>${formatMoney(salary?.bonuses?.performance)}</td>
          </tr>

          <tr>
            <td class="label">Thưởng trách nhiệm</td>
            <td>${formatMoney(salary?.bonuses?.responsibility)}</td>

            <td class="label">Kỳ trả lương</td>
            <td>${getValue(salary?.paymentPeriod)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">
          III. Thông tin ngân hàng
        </div>

        <table>
          <tr>
            <td class="label">Ngân hàng</td>
            <td>${getValue(salary?.bankName)}</td>

            <td class="label">Chi nhánh</td>
            <td>${getValue(salary?.bankBranch)}</td>
          </tr>

          <tr>
            <td class="label">Số tài khoản</td>
            <td>${getValue(salary?.bankAccountNumber)}</td>

            <td class="label">Phương thức thanh toán</td>
            <td>${getValue(salary?.paymentMethod)}</td>
          </tr>
        </table>
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-title">
        I. Thông tin cơ bản
      </div>

      <table>
        <tr>
          <td class="label">Họ và tên</td>
          <td>${getValue(employee.name)}</td>

          <td class="label">Mã nhân viên</td>
          <td>${getValue(work?.employeeCode)}</td>
        </tr>

        <tr>
          <td class="label">Ngày sinh</td>
          <td>${formatDate(personal?.dateOfBirth)}</td>

          <td class="label">Giới tính</td>
          <td>${getValue(personal?.gender)}</td>
        </tr>

        <tr>
          <td class="label">Số điện thoại</td>
          <td>${getValue(employee.phone)}</td>

          <td class="label">Email</td>
          <td>${getValue(employee.email)}</td>
        </tr>

        <tr>
          <td class="label">CCCD</td>
          <td>${getValue(personal?.idCardNumber)}</td>

          <td class="label">Ngày cấp</td>
          <td>${formatDate(personal?.idCardIssueDate)}</td>
        </tr>

        <tr>
          <td class="label">Nơi sinh</td>
          <td colspan="3">
            ${getValue(personal?.placeOfBirth)}
          </td>
        </tr>

        <tr>
          <td class="label">Quê quán</td>
          <td colspan="3">
            ${getValue(personal?.hometown)}
          </td>
        </tr>

        <tr>
          <td class="label">Địa chỉ thường trú</td>
          <td colspan="3">
            ${getValue(personal?.permanentAddress)}
          </td>
        </tr>

        <tr>
          <td class="label">Địa chỉ hiện tại</td>
          <td colspan="3">
            ${getValue(personal?.currentAddress)}
          </td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">
        II. Công việc
      </div>

      <table>
        <tr>
          <td class="label">Phòng ban</td>
          <td>${getValue(work?.department)}</td>

          <td class="label">Chức vụ</td>
          <td>${getValue(work?.position)}</td>
        </tr>

        <tr>
          <td class="label">Ngày nhận việc</td>
          <td>${formatDate(work?.startDate)}</td>

          <td class="label">Trạng thái</td>
          <td>${getValue(employee.status)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">
        III. Hợp đồng
      </div>

      <table>
        <tr>
          <td class="label">Số hợp đồng</td>
          <td>${getValue(contract?.contractNumber)}</td>

          <td class="label">Loại hợp đồng</td>
          <td>${getValue(contract?.contractType)}</td>
        </tr>

        <tr>
          <td class="label">Ngày bắt đầu</td>
          <td>${formatDate(contract?.contractStartDate)}</td>

          <td class="label">Ngày kết thúc</td>
          <td>${formatDate(contract?.contractEndDate)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">
        IV. Lương & bảo hiểm
      </div>

      <table>
        <tr>
          <td class="label">Lương cơ bản</td>
          <td>${formatMoney(salary?.baseSalary)}</td>

          <td class="label">Lương đóng BH</td>
          <td>${formatMoney(salary?.insuranceSalary)}</td>
        </tr>

        <tr>
          <td class="label">Số BHXH</td>
          <td>${getValue(salary?.socialInsuranceNumber)}</td>

          <td class="label">Mã số thuế</td>
          <td>${getValue(salary?.taxCode)}</td>
        </tr>

        <tr>
          <td class="label">Ngân hàng</td>
          <td>${getValue(salary?.bankName)}</td>

          <td class="label">Số tài khoản</td>
          <td>${getValue(salary?.bankAccountNumber)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">
        V. Học tập
      </div>

      ${
        employee.education?.length
          ? `
            <table>
              <tr>
                <th>Từ ngày</th>
                <th>Đến ngày</th>
                <th>Trường</th>
                <th>Chuyên ngành</th>
                <th>Bằng cấp</th>
              </tr>

              ${employee.education
                .map(
                  (item) => `
                    <tr>
                      <td>${formatDate(item.fromDate)}</td>
                      <td>${formatDate(item.toDate)}</td>
                      <td>${getValue(item.school)}</td>
                      <td>${getValue(item.majorOrCertificate)}</td>
                      <td>${getValue(item.degreeOrCertificate)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </table>
          `
          : `
            <table>
              <tr>
                <td class="muted">
                  Chưa có thông tin học tập.
                </td>
              </tr>
            </table>
          `
      }
    </div>

    <div class="section">
      <div class="section-title">
        VI. Kinh nghiệm làm việc
      </div>

      ${
        employee.workExperience?.length
          ? `
            <table>
              <tr>
                <th>Từ ngày</th>
                <th>Đến ngày</th>
                <th>Công ty</th>
                <th>Chức vụ</th>
                <th>Hình thức</th>
              </tr>

              ${employee.workExperience
                .map(
                  (item) => `
                    <tr>
                      <td>${formatDate(item.fromDate)}</td>
                      <td>${formatDate(item.toDate)}</td>
                      <td>${getValue(item.company)}</td>
                      <td>${getValue(item.position)}</td>
                      <td>${getValue(item.employmentType)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </table>
          `
          : `
            <table>
              <tr>
                <td class="muted">
                  Chưa có thông tin kinh nghiệm.
                </td>
              </tr>
            </table>
          `
      }
    </div>
  `;
}

function downloadExcelTemplate(
  employee: Employee,
  template: TemplateType,
) {
  /*
   * Chưa tạo Excel template thật ở bước này.
   *
   * Phần này sẽ được tách sang:
   *
   * utils/employee-templates/excel-template.ts
   *
   * để:
   * - merge cell
   * - border
   * - column width
   * - row height
   * - font
   * - căn giữa
   * - định dạng ngày
   * - định dạng tiền
   * - chèn ảnh nhân viên nếu cần
   *
   * và quan trọng nhất:
   * Excel sẽ giữ đúng layout của từng biểu mẫu.
   */

  const rows = [
    ["BIỂU MẪU NHÂN SỰ"],
    [getTemplateTitle(template)],
    [],
    ["Họ và tên", employee.name || ""],
    [
      "Mã nhân viên",
      employee.workInfo?.employeeCode || "",
    ],
    [
      "Phòng ban",
      employee.workInfo?.department || "",
    ],
    [
      "Chức vụ",
      employee.workInfo?.position || "",
    ],
  ];

  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");

          if (
            text.includes(",") ||
            text.includes('"') ||
            text.includes("\n")
          ) {
            return `"${text.replace(/"/g, '""')}"`;
          }

          return text;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    `${template}-${employee.workInfo?.employeeCode || employee._id}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function EmployeeTemplateModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [template, setTemplate] =
    useState<TemplateType>("EMPLOYEE_INFO");

  const selectedTemplate = useMemo(
    () =>
      TEMPLATE_OPTIONS.find(
        (item) => item.value === template,
      ),
    [template],
  );

  const handlePrint = () => {
    printEmployeeTemplate(employee, template);
  };

  const handleExcel = () => {
  exportEmployeeTemplateToExcel(
    employee,
    template,
  );
};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Biểu mẫu nhân sự
                </h2>

                <p className="text-sm text-slate-500">
                  {employee.name}
                  {employee.workInfo?.employeeCode
                    ? ` • ${employee.workInfo.employeeCode}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
          {/* Template list */}
          <div className="overflow-y-auto border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">
                Chọn biểu mẫu
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Chọn loại hồ sơ muốn in hoặc xuất Excel.
              </p>
            </div>

            <div className="space-y-2">
              {TEMPLATE_OPTIONS.map((item) => {
                const active = item.value === template;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setTemplate(item.value)
                    }
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-violet-300 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            active
                              ? "text-violet-900"
                              : "text-slate-800"
                          }`}
                        >
                          {item.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="min-h-0 overflow-y-auto bg-slate-100 p-4 lg:p-6">
            <div className="mx-auto max-w-[794px]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Xem trước
                  </p>

                  <p className="text-xs text-slate-500">
                    {selectedTemplate?.label}
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                  A4
                </span>
              </div>

              {/* A4 Preview */}
              <div className="min-h-[1123px] bg-white p-8 shadow-lg">
                <div className="text-center">
                  <p className="text-sm font-bold uppercase text-slate-800">
                    THÔNG TIN NHÂN SỰ
                  </p>

                  <h1 className="mt-2 text-xl font-bold uppercase text-slate-900">
                    {selectedTemplate?.label}
                  </h1>

                  <p className="mt-1 text-xs text-slate-500">
                    Mã nhân viên:{" "}
                    {employee.workInfo?.employeeCode ||
                      "-"}
                  </p>
                </div>

                {/* Basic preview */}
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-300">
                  <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold uppercase text-slate-800">
                    Thông tin nhân viên
                  </div>

                  <div className="grid grid-cols-2">
                    <PreviewField
                      label="Họ và tên"
                      value={employee.name}
                    />

                    <PreviewField
                      label="Mã nhân viên"
                      value={
                        employee.workInfo?.employeeCode
                      }
                    />

                    <PreviewField
                      label="Phòng ban"
                      value={
                        employee.workInfo?.department
                      }
                    />

                    <PreviewField
                      label="Chức vụ"
                      value={
                        employee.workInfo?.position
                      }
                    />

                    <PreviewField
                      label="Số điện thoại"
                      value={employee.phone}
                    />

                    <PreviewField
                      label="Email"
                      value={employee.email}
                    />

                    <PreviewField
                      label="Ngày sinh"
                      value={formatDate(
                        employee.personalInfo?.dateOfBirth,
                      )}
                    />

                    <PreviewField
                      label="Giới tính"
                      value={
                        employee.personalInfo?.gender
                      }
                    />
                  </div>
                </div>

                {template === "EMPLOYEE_INFO" && (
                  <>
                    <PreviewSection title="Thông tin cá nhân">
                      <PreviewField
                        label="Nơi sinh"
                        value={
                          employee.personalInfo
                            ?.placeOfBirth
                        }
                      />

                      <PreviewField
                        label="Quê quán"
                        value={
                          employee.personalInfo?.hometown
                        }
                      />

                      <PreviewField
                        label="CCCD"
                        value={
                          employee.personalInfo
                            ?.idCardNumber
                        }
                      />

                      <PreviewField
                        label="Ngày cấp"
                        value={formatDate(
                          employee.personalInfo
                            ?.idCardIssueDate,
                        )}
                      />

                      <PreviewField
                        label="Địa chỉ thường trú"
                        value={
                          employee.personalInfo
                            ?.permanentAddress
                        }
                        full
                      />

                      <PreviewField
                        label="Địa chỉ hiện tại"
                        value={
                          employee.personalInfo
                            ?.currentAddress
                        }
                        full
                      />
                    </PreviewSection>

                    <PreviewSection title="Liên hệ khẩn cấp">
                      <PreviewField
                        label="Họ tên"
                        value={
                          employee.personalInfo
                            ?.emergencyContact?.name
                        }
                      />

                      <PreviewField
                        label="Quan hệ"
                        value={
                          employee.personalInfo
                            ?.emergencyContact
                            ?.relationship
                        }
                      />

                      <PreviewField
                        label="Số điện thoại"
                        value={
                          employee.personalInfo
                            ?.emergencyContact?.phone
                        }
                      />

                      <PreviewField
                        label="Địa chỉ"
                        value={
                          employee.personalInfo
                            ?.emergencyContact?.address
                        }
                        full
                      />
                    </PreviewSection>
                  </>
                )}

                {template === "RESUME" && (
                  <>
                    <PreviewSection title="Gia đình">
                      {employee.personalInfo
                        ?.familyMembers?.length ? (
                        <div className="col-span-2 overflow-hidden rounded border border-slate-200">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="border-b border-slate-200 px-2 py-2 text-left">
                                  Họ tên
                                </th>
                                <th className="border-b border-slate-200 px-2 py-2 text-left">
                                  Quan hệ
                                </th>
                                <th className="border-b border-slate-200 px-2 py-2 text-left">
                                  Năm sinh
                                </th>
                                <th className="border-b border-slate-200 px-2 py-2 text-left">
                                  Nghề nghiệp
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {employee.personalInfo.familyMembers.map(
                                (member, index) => (
                                  <tr key={index}>
                                    <td className="border-b border-slate-100 px-2 py-2">
                                      {getValue(
                                        member.name,
                                      )}
                                    </td>

                                    <td className="border-b border-slate-100 px-2 py-2">
                                      {getValue(
                                        member.relationship,
                                      )}
                                    </td>

                                    <td className="border-b border-slate-100 px-2 py-2">
                                      {getValue(
                                        member.birthYear,
                                      )}
                                    </td>

                                    <td className="border-b border-slate-100 px-2 py-2">
                                      {getValue(
                                        member.occupation,
                                      )}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="col-span-2 px-3 py-4 text-xs text-slate-400">
                          Chưa có thông tin gia đình.
                        </div>
                      )}
                    </PreviewSection>

                    <PreviewSection title="Học tập">
                      <PreviewListCount
                        label="Số quá trình học tập"
                        value={
                          employee.education?.length || 0
                        }
                      />
                    </PreviewSection>

                    <PreviewSection title="Kinh nghiệm làm việc">
                      <PreviewListCount
                        label="Số quá trình công tác"
                        value={
                          employee.workExperience
                            ?.length || 0
                        }
                      />
                    </PreviewSection>
                  </>
                )}

                {template === "CONTRACT" && (
                  <PreviewSection title="Thông tin hợp đồng">
                    <PreviewField
                      label="Số hợp đồng"
                      value={
                        employee.contractInfo
                          ?.contractNumber
                      }
                    />

                    <PreviewField
                      label="Loại hợp đồng"
                      value={
                        employee.contractInfo
                          ?.contractType
                      }
                    />

                    <PreviewField
                      label="Ngày bắt đầu"
                      value={formatDate(
                        employee.contractInfo
                          ?.contractStartDate,
                      )}
                    />

                    <PreviewField
                      label="Ngày kết thúc"
                      value={formatDate(
                        employee.contractInfo
                          ?.contractEndDate,
                      )}
                    />

                    <PreviewField
                      label="Bắt đầu thử việc"
                      value={formatDate(
                        employee.contractInfo
                          ?.probationStartDate,
                      )}
                    />

                    <PreviewField
                      label="Kết thúc thử việc"
                      value={formatDate(
                        employee.contractInfo
                          ?.probationEndDate,
                      )}
                    />

                    <PreviewField
                      label="Ghi chú"
                      value={
                        employee.contractInfo?.notes
                      }
                      full
                    />
                  </PreviewSection>
                )}

                {template === "SALARY_INSURANCE" && (
                  <>
                    <PreviewSection title="Lương & bảo hiểm">
                      <PreviewField
                        label="Lương cơ bản"
                        value={formatMoney(
                          employee.salaryAndBenefits
                            ?.baseSalary,
                        )}
                      />

                      <PreviewField
                        label="Lương đóng BH"
                        value={formatMoney(
                          employee.salaryAndBenefits
                            ?.insuranceSalary,
                        )}
                      />

                      <PreviewField
                        label="Số BHXH"
                        value={
                          employee.salaryAndBenefits
                            ?.socialInsuranceNumber
                        }
                      />

                      <PreviewField
                        label="Mã số thuế"
                        value={
                          employee.salaryAndBenefits
                            ?.taxCode
                        }
                      />

                      <PreviewField
                        label="Người phụ thuộc"
                        value={
                          employee.salaryAndBenefits
                            ?.dependents
                        }
                      />

                      <PreviewField
                        label="Tiền ăn"
                        value={formatMoney(
                          employee.salaryAndBenefits
                            ?.mealRate,
                        )}
                      />
                    </PreviewSection>

                    <PreviewSection title="Ngân hàng">
                      <PreviewField
                        label="Ngân hàng"
                        value={
                          employee.salaryAndBenefits
                            ?.bankName
                        }
                      />

                      <PreviewField
                        label="Chi nhánh"
                        value={
                          employee.salaryAndBenefits
                            ?.bankBranch
                        }
                      />

                      <PreviewField
                        label="Số tài khoản"
                        value={
                          employee.salaryAndBenefits
                            ?.bankAccountNumber
                        }
                      />

                      <PreviewField
                        label="Phương thức thanh toán"
                        value={
                          employee.salaryAndBenefits
                            ?.paymentMethod
                        }
                      />
                    </PreviewSection>
                  </>
                )}

                {template === "EMPLOYEE_FULL" && (
                  <>
                    <PreviewSection title="Hợp đồng">
                      <PreviewField
                        label="Số hợp đồng"
                        value={
                          employee.contractInfo
                            ?.contractNumber
                        }
                      />

                      <PreviewField
                        label="Loại hợp đồng"
                        value={
                          employee.contractInfo
                            ?.contractType
                        }
                      />

                      <PreviewField
                        label="Ngày bắt đầu"
                        value={formatDate(
                          employee.contractInfo
                            ?.contractStartDate,
                        )}
                      />

                      <PreviewField
                        label="Ngày kết thúc"
                        value={formatDate(
                          employee.contractInfo
                            ?.contractEndDate,
                        )}
                      />
                    </PreviewSection>

                    <PreviewSection title="Lương & bảo hiểm">
                      <PreviewField
                        label="Lương cơ bản"
                        value={formatMoney(
                          employee.salaryAndBenefits
                            ?.baseSalary,
                        )}
                      />

                      <PreviewField
                        label="Lương đóng BH"
                        value={formatMoney(
                          employee.salaryAndBenefits
                            ?.insuranceSalary,
                        )}
                      />

                      <PreviewField
                        label="Số BHXH"
                        value={
                          employee.salaryAndBenefits
                            ?.socialInsuranceNumber
                        }
                      />

                      <PreviewField
                        label="Mã số thuế"
                        value={
                          employee.salaryAndBenefits
                            ?.taxCode
                        }
                      />

                      <PreviewField
                        label="Ngân hàng"
                        value={
                          employee.salaryAndBenefits
                            ?.bankName
                        }
                      />

                      <PreviewField
                        label="Số tài khoản"
                        value={
                          employee.salaryAndBenefits
                            ?.bankAccountNumber
                        }
                      />
                    </PreviewSection>

                    <PreviewSection title="Học tập & kinh nghiệm">
                      <PreviewListCount
                        label="Quá trình học tập"
                        value={
                          employee.education?.length || 0
                        }
                      />

                      <PreviewListCount
                        label="Quá trình công tác"
                        value={
                          employee.workExperience
                            ?.length || 0
                        }
                      />
                    </PreviewSection>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Biểu mẫu:{" "}
            <span className="font-semibold text-slate-700">
              {selectedTemplate?.label}
            </span>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Đóng
            </button>

            <button
              type="button"
              onClick={handleExcel}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              In biểu mẫu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-slate-300">
      <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold uppercase text-slate-800">
        {title}
      </div>

      <div className="grid grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  full = false,
}: {
  label: string;
  value?: string | number | null;
  full?: boolean;
}) {
  return (
    <div
      className={`border-b border-slate-200 px-3 py-2.5 ${
        full ? "col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-sm text-slate-800">
        {getValue(value)}
      </p>
    </div>
  );
}

function PreviewListCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="col-span-2 px-3 py-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value} mục
      </p>
    </div>
  );
}
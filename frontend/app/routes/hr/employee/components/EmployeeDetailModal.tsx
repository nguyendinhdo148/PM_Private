import { Edit, X } from "lucide-react";
import type { Employee } from "../types";
import { GENDER_OPTIONS, MARITAL_OPTIONS, STATUS_OPTIONS } from "../constants";
import { DetailSection, DetailItem } from "./ui";

const formatDate = (date?: string) => { if (!date) return "-"; const value = new Date(date); if (Number.isNaN(value.getTime())) return "-"; return value.toLocaleDateString("vi-VN"); };
const formatMoney = (value?: number) => value == null || Number.isNaN(Number(value)) ? "-" : Number(value).toLocaleString("vi-VN") + " ₫";
const getStatusLabel = (status?: Employee["status"]) => STATUS_OPTIONS.find((item) => item.value === status)?.label || status || "-";

/**
 * =========================================================
 * DETAIL MODAL
 * =========================================================
 */

export function EmployeeDetailModal({
  employee,
  onClose,
  onEdit,
}: {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100">
              {employee.avatar
                ?.url ? (
                <img
                  src={
                    employee.avatar.url
                  }
                  alt={
                    employee.name
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                  {employee.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {employee.name}
              </h2>

              <p className="text-sm text-slate-500">
                {employee.workInfo
                  ?.employeeCode ||
                  "Chưa có mã nhân viên"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Chỉnh sửa
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CONTENT */}

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DetailSection title="Thông tin cơ bản">
              <DetailItem
                label="Họ tên"
                value={
                  employee.name
                }
              />

              <DetailItem
                label="Số điện thoại"
                value={
                  employee.phone
                }
              />

              <DetailItem
                label="Email"
                value={
                  employee.email
                }
              />

              <DetailItem
                label="Trạng thái"
                value={getStatusLabel(
                  employee.status,
                )}
              />
            </DetailSection>

            <DetailSection title="Công việc">
              <DetailItem
                label="Mã nhân viên"
                value={
                  employee.workInfo
                    ?.employeeCode
                }
              />

              <DetailItem
                label="Phòng ban"
                value={
                  employee.workInfo
                    ?.department
                }
              />

              <DetailItem
                label="Chức vụ"
                value={
                  employee.workInfo
                    ?.position
                }
              />

              <DetailItem
                label="Ngày nhận việc"
                value={formatDate(
                  employee.workInfo
                    ?.startDate,
                )}
              />

              <DetailItem
                label="Thời gian làm việc"
                value={
                  employee
                    .workingDuration
                    ?.text
                }
              />
            </DetailSection>

            <DetailSection title="Sơ yếu lý lịch">
              <DetailItem
                label="Ngày sinh"
                value={formatDate(
                  employee
                    .personalInfo
                    ?.dateOfBirth,
                )}
              />

              <DetailItem
                label="Nơi sinh"
                value={
                  employee
                    .personalInfo
                    ?.placeOfBirth
                }
              />

              <DetailItem
                label="Nguyên quán"
                value={
                  employee
                    .personalInfo
                    ?.hometown
                }
              />

              <DetailItem
                label="CCCD"
                value={
                  employee
                    .personalInfo
                    ?.idCardNumber
                }
              />

              <DetailItem
                label="Giới tính"
                value={
                  GENDER_OPTIONS.find(
                    (item) =>
                      item.value ===
                      employee
                        .personalInfo
                        ?.gender,
                  )?.label
                }
              />

              <DetailItem
                label="Hôn nhân"
                value={
                  MARITAL_OPTIONS.find(
                    (item) =>
                      item.value ===
                      employee
                        .personalInfo
                        ?.maritalStatus,
                  )?.label
                }
              />
            </DetailSection>

            <DetailSection title="Người liên hệ khẩn cấp">
              <DetailItem
                label="Họ tên"
                value={
                  employee
                    .personalInfo
                    ?.emergencyContact
                    ?.name
                }
              />

              <DetailItem
                label="Quan hệ"
                value={
                  employee
                    .personalInfo
                    ?.emergencyContact
                    ?.relationship
                }
              />

              <DetailItem
                label="Số điện thoại"
                value={
                  employee
                    .personalInfo
                    ?.emergencyContact
                    ?.phone
                }
              />

              <DetailItem
                label="Địa chỉ"
                value={
                  employee
                    .personalInfo
                    ?.emergencyContact
                    ?.address
                }
              />
            </DetailSection>

            <DetailSection title="Hợp đồng">
              <DetailItem
                label="Số hợp đồng"
                value={
                  employee
                    .contractInfo
                    ?.contractNumber
                }
              />

              <DetailItem
                label="Loại hợp đồng"
                value={
                  employee
                    .contractInfo
                    ?.contractType
                }
              />

              <DetailItem
                label="Ngày bắt đầu"
                value={formatDate(
                  employee
                    .contractInfo
                    ?.contractStartDate,
                )}
              />

              <DetailItem
                label="Ngày kết thúc"
                value={formatDate(
                  employee
                    .contractInfo
                    ?.contractEndDate,
                )}
              />

              <DetailItem
                label="Trạng thái"
                value={
                  employee.currentContractStatus
                }
              />
            </DetailSection>

            <DetailSection title="Lương & ngân hàng">
              <DetailItem
                label="Lương cơ bản"
                value={formatMoney(
                  employee
                    .salaryAndBenefits
                    ?.baseSalary,
                )}
              />

              <DetailItem
                label="Lương đóng BH"
                value={formatMoney(
                  employee
                    .salaryAndBenefits
                    ?.insuranceSalary,
                )}
              />

              <DetailItem
                label="Số BHXH"
                value={
                  employee
                    .salaryAndBenefits
                    ?.socialInsuranceNumber
                }
              />

              <DetailItem
                label="Mã số thuế"
                value={
                  employee
                    .salaryAndBenefits
                    ?.taxCode
                }
              />

              <DetailItem
                label="Tiền ăn ca"
                value={
                  employee
                    .salaryAndBenefits
                    ?.mealRate !==
                  undefined
                    ? formatMoney(
                        employee
                          .salaryAndBenefits
                          .mealRate,
                      )
                    : "-"
                }
              />

              <DetailItem
                label="Ngân hàng"
                value={
                  employee
                    .salaryAndBenefits
                    ?.bankName
                }
              />

              <DetailItem
                label="Chi nhánh"
                value={
                  employee
                    .salaryAndBenefits
                    ?.bankBranch
                }
              />

              <DetailItem
                label="Số tài khoản"
                value={
                  employee
                    .salaryAndBenefits
                    ?.bankAccountNumber
                }
              />
            </DetailSection>

            <DetailSection title="Địa chỉ">
              <DetailItem
                label="Thường trú"
                value={
                  employee
                    .personalInfo
                    ?.permanentAddress
                }
              />

              <DetailItem
                label="Hiện tại"
                value={
                  employee
                    .personalInfo
                    ?.currentAddress
                }
              />
            </DetailSection>

            <DetailSection title="Ghi chú">
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {employee.notes ||
                  "Không có ghi chú."}
              </p>
            </DetailSection>
          </div>

          {/* FAMILY */}

          <div className="mt-6">
            <DetailSection title="Thành viên gia đình">
              {employee.personalInfo
                ?.familyMembers
                ?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left">
                          Họ tên
                        </th>
                        <th className="px-3 py-2 text-left">
                          Quan hệ
                        </th>
                        <th className="px-3 py-2 text-left">
                          Năm sinh
                        </th>
                        <th className="px-3 py-2 text-left">
                          Nghề nghiệp
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {employee.personalInfo.familyMembers.map(
                        (
                          member,
                          index,
                        ) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-2">
                              {member.name ||
                                "-"}
                            </td>

                            <td className="px-3 py-2">
                              {member.relationship ||
                                "-"}
                            </td>

                            <td className="px-3 py-2">
                              {member.birthYear ||
                                "-"}
                            </td>

                            <td className="px-3 py-2">
                              {member.occupation ||
                                "-"}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Chưa có thông tin.
                </p>
              )}
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
}


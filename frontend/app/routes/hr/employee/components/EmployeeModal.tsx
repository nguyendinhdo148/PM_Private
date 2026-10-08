import { useRef, useState } from "react";
import { RefreshCw, UserPlus, X } from "lucide-react";
import type {
  Education,
  Employee,
  EmployeeForm,
  EmployeeStatus,
  FamilyMember,
  WorkExperience,
} from "../types";
import { GENDER_OPTIONS, MARITAL_OPTIONS, STATUS_OPTIONS } from "../constants";
import { SectionTitle, Input, Textarea, Select, EmptyArrayState } from "./ui";

export function EmployeeModal({
  form,
  setForm,
  editingEmployee,
  saving,
  onClose,
  onSubmit,
}: {
  form: EmployeeForm;
  setForm: React.Dispatch<
    React.SetStateAction<EmployeeForm>
  >;
  editingEmployee: Employee | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent,
  ) => void;
}) {
  const [activeTab, setActiveTab] =
    useState("basic");
    const handleAvatarUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Vui lòng chọn file hình ảnh.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Ảnh không được vượt quá 5MB.");
    event.target.value = "";
    return;
  }

  try {
    setUploadingAvatar(true);

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/employees/upload-avatar`,
      {
        method: "POST",
        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Không thể upload ảnh",
      );
    }

    updateField(
      "avatarUrl",
      data.avatar.url,
    );

    // Nếu EmployeeForm của bạn đã có avatarPublicId
    // thì lưu luôn publicId.
    if ("avatarPublicId" in form) {
      updateField(
        "avatarPublicId" as keyof EmployeeForm,
        data.avatar.publicId,
      );
    }
  } catch (error) {
    console.error(
      "handleAvatarUpload error:",
      error,
    );

    alert(
      error instanceof Error
        ? error.message
        : "Không thể upload ảnh",
    );
  } finally {
    setUploadingAvatar(false);

    // Cho phép chọn lại cùng một file
    event.target.value = "";
  }
};
const fileInputRef = useRef<HTMLInputElement | null>(null);

const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const updateField = <
    K extends keyof EmployeeForm,
  >(
    field: K,
    value: EmployeeForm[K],
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      }),
    );
  };

  const updateFamilyMember = (
    index: number,
    field: keyof FamilyMember,
    value: string,
  ) => {
    setForm(
      (previous) => {
        const family = [
          ...previous.familyMembers,
        ];

        family[index] = {
          ...family[index],
          [field]:
            field === "birthYear"
              ? value
                ? Number(value)
                : undefined
              : value,
        };

        return {
          ...previous,
          familyMembers: family,
        };
      },
    );
  };

  const updateEducation = (
    index: number,
    field: keyof Education,
    value: string,
  ) => {
    setForm(
      (previous) => {
        const education = [
          ...previous.education,
        ];

        education[index] = {
          ...education[index],
          [field]: value,
        };

        return {
          ...previous,
          education,
        };
      },
    );
  };

  const updateExperience = (
    index: number,
    field: keyof WorkExperience,
    value: string,
  ) => {
    setForm(
      (previous) => {
        const experience = [
          ...previous.workExperience,
        ];

        experience[index] = {
          ...experience[index],
          [field]: value,
        };

        return {
          ...previous,
          workExperience:
            experience,
        };
      },
    );
  };

  const tabs = [
    {
      id: "basic",
      label: "Thông tin cơ bản",
    },
    {
      id: "personal",
      label: "Sơ yếu lý lịch",
    },
    {
      id: "work",
      label: "Công việc",
    },
    {
      id: "contract",
      label: "Hợp đồng",
    },
    {
      id: "salary",
      label: "Lương & ngân hàng",
    },
    {
      id: "education",
      label: "Học tập",
    },
    {
      id: "experience",
      label: "Kinh nghiệm",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingEmployee
                ? "Chỉnh sửa nhân viên"
                : "Thêm nhân viên"}
            </h2>

            <p className="text-sm text-slate-500">
              Nhập đầy đủ thông tin hồ sơ
              nhân sự.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TABS */}

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {/* ===========================================
                BASIC
            =========================================== */}

            {activeTab === "basic" && (
              <div className="space-y-6">
                <SectionTitle>
                  Thông tin cơ bản
                </SectionTitle>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Ảnh nhân viên
                    </label>

                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-xl bg-slate-100">
                        {form.avatarUrl ? (
                          <img
                            src={
                              form.avatarUrl
                            }
                            alt={
                              form.name ||
                              "Avatar"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <UserPlus className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleAvatarUpload}
    className="hidden"
  />

  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={uploadingAvatar}
    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {uploadingAvatar ? (
      <>
        <RefreshCw className="h-4 w-4 animate-spin" />
        Đang tải ảnh...
      </>
    ) : (
      <>
        <UserPlus className="h-4 w-4" />
        Chọn ảnh từ thiết bị
      </>
    )}
  </button>

  <p className="mt-2 text-xs text-slate-400">
    JPG, PNG, WEBP. Tối đa 5MB.
  </p>
</div>
                    </div>
                  </div>

                  <Input
                    label="Họ và tên *"
                    value={form.name}
                    onChange={(value) =>
                      updateField(
                        "name",
                        value,
                      )
                    }
                    placeholder="Nguyễn Văn A"
                  />

                  <Input
                    label="Mã nhân viên"
                    value={
                      form.employeeCode
                    }
                    onChange={(value) =>
                      updateField(
                        "employeeCode",
                        value,
                      )
                    }
                    placeholder="NV001"
                  />

                  <Input
                    label="Số điện thoại"
                    value={form.phone}
                    onChange={(value) =>
                      updateField(
                        "phone",
                        value,
                      )
                    }
                    placeholder="09xxxxxxxx"
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateField(
                        "email",
                        value,
                      )
                    }
                    placeholder="email@example.com"
                  />

                  <Select
                    label="Trạng thái"
                    value={form.status}
                    onChange={(value) =>
                      updateField(
                        "status",
                        value as EmployeeStatus,
                      )
                    }
                    options={STATUS_OPTIONS}
                  />
                </div>
              </div>
            )}

            {/* ===========================================
                PERSONAL
            =========================================== */}

            {activeTab ===
              "personal" && (
              <div className="space-y-8">
                <div>
                  <SectionTitle>
                    Sơ yếu lý lịch
                  </SectionTitle>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <Input
                      label="Ngày sinh"
                      type="date"
                      value={
                        form.dateOfBirth
                      }
                      onChange={(value) =>
                        updateField(
                          "dateOfBirth",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Nơi sinh"
                      value={
                        form.placeOfBirth
                      }
                      onChange={(value) =>
                        updateField(
                          "placeOfBirth",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Nguyên quán"
                      value={
                        form.hometown
                      }
                      onChange={(value) =>
                        updateField(
                          "hometown",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Số CCCD"
                      value={
                        form.idCardNumber
                      }
                      onChange={(value) =>
                        updateField(
                          "idCardNumber",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Ngày cấp CCCD"
                      type="date"
                      value={
                        form.idCardIssueDate
                      }
                      onChange={(value) =>
                        updateField(
                          "idCardIssueDate",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Nơi cấp CCCD"
                      value={
                        form.idCardIssuePlace
                      }
                      onChange={(value) =>
                        updateField(
                          "idCardIssuePlace",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Quốc tịch"
                      value={
                        form.nationality
                      }
                      onChange={(value) =>
                        updateField(
                          "nationality",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Dân tộc"
                      value={
                        form.ethnicity
                      }
                      onChange={(value) =>
                        updateField(
                          "ethnicity",
                          value,
                        )
                      }
                    />

                    <Select
                      label="Giới tính"
                      value={form.gender}
                      onChange={(value) =>
                        updateField(
                          "gender",
                          value,
                        )
                      }
                      options={
                        GENDER_OPTIONS
                      }
                    />

                    <Select
                      label="Tình trạng hôn nhân"
                      value={
                        form.maritalStatus
                      }
                      onChange={(value) =>
                        updateField(
                          "maritalStatus",
                          value,
                        )
                      }
                      options={
                        MARITAL_OPTIONS
                      }
                    />

                    <div className="md:col-span-3">
                      <Textarea
                        label="Địa chỉ thường trú"
                        value={
                          form.permanentAddress
                        }
                        onChange={(value) =>
                          updateField(
                            "permanentAddress",
                            value,
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Textarea
                        label="Địa chỉ hiện tại"
                        value={
                          form.currentAddress
                        }
                        onChange={(value) =>
                          updateField(
                            "currentAddress",
                            value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* EMERGENCY */}

                <div>
                  <SectionTitle>
                    Người liên hệ khẩn cấp
                  </SectionTitle>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <Input
                      label="Họ và tên"
                      value={
                        form.emergencyName
                      }
                      onChange={(value) =>
                        updateField(
                          "emergencyName",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Quan hệ"
                      value={
                        form.emergencyRelationship
                      }
                      onChange={(value) =>
                        updateField(
                          "emergencyRelationship",
                          value,
                        )
                      }
                      placeholder="Cha / Mẹ / Vợ / Chồng..."
                    />

                    <Input
                      label="Số điện thoại"
                      value={
                        form.emergencyPhone
                      }
                      onChange={(value) =>
                        updateField(
                          "emergencyPhone",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Địa chỉ"
                      value={
                        form.emergencyAddress
                      }
                      onChange={(value) =>
                        updateField(
                          "emergencyAddress",
                          value,
                        )
                      }
                    />
                  </div>
                </div>

                {/* FAMILY */}

                <div>
                  <div className="flex items-center justify-between">
                    <SectionTitle>
                      Thành viên gia đình
                    </SectionTitle>

                    <button
                      type="button"
                      onClick={() =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            familyMembers:
                              [
                                ...previous.familyMembers,
                                {},
                              ],
                          }),
                        )
                      }
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      + Thêm thành viên
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {form.familyMembers.map(
                      (
                        member,
                        index,
                      ) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
                        >
                          <Input
                            label="Họ tên"
                            value={
                              member.name ||
                              ""
                            }
                            onChange={(
                              value,
                            ) =>
                              updateFamilyMember(
                                index,
                                "name",
                                value,
                              )
                            }
                          />

                          <Input
                            label="Quan hệ"
                            value={
                              member.relationship ||
                              ""
                            }
                            onChange={(
                              value,
                            ) =>
                              updateFamilyMember(
                                index,
                                "relationship",
                                value,
                              )
                            }
                          />

                          <Input
                            label="Năm sinh"
                            type="number"
                            value={
                              member.birthYear
                                ? String(
                                    member.birthYear,
                                  )
                                : ""
                            }
                            onChange={(
                              value,
                            ) =>
                              updateFamilyMember(
                                index,
                                "birthYear",
                                value,
                              )
                            }
                          />

                          <div className="md:col-span-2">
                            <Input
                              label="Nghề nghiệp"
                              value={
                                member.occupation ||
                                ""
                              }
                              onChange={(
                                value,
                              ) =>
                                updateFamilyMember(
                                  index,
                                  "occupation",
                                  value,
                                )
                              }
                            />
                          </div>

                          <div className="md:col-span-5">
                            <button
                              type="button"
                              onClick={() =>
                                setForm(
                                  (
                                    previous,
                                  ) => ({
                                    ...previous,
                                    familyMembers:
                                      previous.familyMembers.filter(
                                        (
                                          _,
                                          itemIndex,
                                        ) =>
                                          itemIndex !==
                                          index,
                                      ),
                                  }),
                                )
                              }
                              className="text-xs font-medium text-red-500 hover:text-red-600"
                            >
                              Xóa thành viên
                            </button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===========================================
                WORK
            =========================================== */}

            {activeTab === "work" && (
              <div className="space-y-6">
                <SectionTitle>
                  Thông tin công việc
                </SectionTitle>

                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Ngày nhận việc"
                    type="date"
                    value={
                      form.startDate
                    }
                    onChange={(value) =>
                      updateField(
                        "startDate",
                        value,
                      )
                    }
                  />

                  <Input
                    label="Phòng ban"
                    value={
                      form.department
                    }
                    onChange={(value) =>
                      updateField(
                        "department",
                        value,
                      )
                    }
                    placeholder="FOH / BOH..."
                  />

                  <Input
                    label="Chức danh"
                    value={
                      form.position
                    }
                    onChange={(value) =>
                      updateField(
                        "position",
                        value,
                      )
                    }
                    placeholder="Nhân viên phục vụ..."
                  />
                </div>
              </div>
            )}

            {/* ===========================================
                CONTRACT
            =========================================== */}

            {activeTab ===
              "contract" && (
              <div className="space-y-6">
                <SectionTitle>
                  Thông tin hợp đồng
                </SectionTitle>

                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Số hợp đồng"
                    value={
                      form.contractNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "contractNumber",
                        value,
                      )
                    }
                  />

                  <Input
                    label="Loại hợp đồng"
                    value={
                      form.contractType
                    }
                    onChange={(value) =>
                      updateField(
                        "contractType",
                        value,
                      )
                    }
                    placeholder="Thử việc / Xác định thời hạn / Không xác định..."
                  />

                  <Input
                    label="Ngày bắt đầu hợp đồng"
                    type="date"
                    value={
                      form.contractStartDate
                    }
                    onChange={(value) =>
                      updateField(
                        "contractStartDate",
                        value,
                      )
                    }
                  />

                  <Input
                    label="Ngày kết thúc hợp đồng"
                    type="date"
                    value={
                      form.contractEndDate
                    }
                    onChange={(value) =>
                      updateField(
                        "contractEndDate",
                        value,
                      )
                    }
                  />

                  <Input
                    label="Bắt đầu thử việc"
                    type="date"
                    value={
                      form.probationStartDate
                    }
                    onChange={(value) =>
                      updateField(
                        "probationStartDate",
                        value,
                      )
                    }
                  />

                  <Input
                    label="Kết thúc thử việc"
                    type="date"
                    value={
                      form.probationEndDate
                    }
                    onChange={(value) =>
                      updateField(
                        "probationEndDate",
                        value,
                      )
                    }
                  />

                  <div className="md:col-span-2">
                    <Textarea
                      label="Ghi chú hợp đồng"
                      value={
                        form.contractNotes
                      }
                      onChange={(value) =>
                        updateField(
                          "contractNotes",
                          value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===========================================
                SALARY
            =========================================== */}

            {activeTab ===
              "salary" && (
              <div className="space-y-8">
                <div>
                  <SectionTitle>
                    Lương & bảo hiểm
                  </SectionTitle>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <Input
                      label="Lương cơ bản"
                      type="number"
                      value={
                        form.baseSalary
                      }
                      onChange={(value) =>
                        updateField(
                          "baseSalary",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Lương đóng BH"
                      type="number"
                      value={
                        form.insuranceSalary
                      }
                      onChange={(value) =>
                        updateField(
                          "insuranceSalary",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Số BHXH"
                      value={
                        form.socialInsuranceNumber
                      }
                      onChange={(value) =>
                        updateField(
                          "socialInsuranceNumber",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Mã số thuế"
                      value={
                        form.taxCode
                      }
                      onChange={(value) =>
                        updateField(
                          "taxCode",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Người phụ thuộc"
                      type="number"
                      value={
                        form.dependents
                      }
                      onChange={(value) =>
                        updateField(
                          "dependents",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Tiền ăn ca"
                      type="number"
                      value={
                        form.mealRate
                      }
                      onChange={(value) =>
                        updateField(
                          "mealRate",
                          value,
                        )
                      }
                      placeholder="Người dùng tự nhập"
                    />

                    <Input
                      label="Thưởng chung"
                      type="number"
                      value={
                        form.bonusGeneral
                      }
                      onChange={(value) =>
                        updateField(
                          "bonusGeneral",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Thưởng hiệu suất"
                      type="number"
                      value={
                        form.bonusPerformance
                      }
                      onChange={(value) =>
                        updateField(
                          "bonusPerformance",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Thưởng trách nhiệm"
                      type="number"
                      value={
                        form.bonusResponsibility
                      }
                      onChange={(value) =>
                        updateField(
                          "bonusResponsibility",
                          value,
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <SectionTitle>
                    Thông tin ngân hàng
                  </SectionTitle>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <Input
                      label="Tên ngân hàng"
                      value={
                        form.bankName
                      }
                      onChange={(value) =>
                        updateField(
                          "bankName",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Chi nhánh ngân hàng"
                      value={
                        form.bankBranch
                      }
                      onChange={(value) =>
                        updateField(
                          "bankBranch",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Số tài khoản"
                      value={
                        form.bankAccountNumber
                      }
                      onChange={(value) =>
                        updateField(
                          "bankAccountNumber",
                          value,
                        )
                      }
                    />

                    <Input
                      label="Phương thức thanh toán"
                      value={
                        form.paymentMethod
                      }
                      onChange={(value) =>
                        updateField(
                          "paymentMethod",
                          value,
                        )
                      }
                      placeholder="Chuyển khoản / Tiền mặt..."
                    />

                    <Input
                      label="Kỳ trả lương"
                      value={
                        form.paymentPeriod
                      }
                      onChange={(value) =>
                        updateField(
                          "paymentPeriod",
                          value,
                        )
                      }
                      placeholder="Hàng tháng..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===========================================
                EDUCATION
            =========================================== */}

            {activeTab ===
              "education" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <SectionTitle>
                    Học tập & đào tạo
                  </SectionTitle>

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          education: [
                            ...previous.education,
                            {},
                          ],
                        }),
                      )
                    }
                    className="text-sm font-medium text-blue-600"
                  >
                    + Thêm quá trình
                  </button>
                </div>

                {form.education.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Từ ngày"
                          type="date"
                          value={
                            item.fromDate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEducation(
                              index,
                              "fromDate",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Đến ngày"
                          type="date"
                          value={
                            item.toDate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEducation(
                              index,
                              "toDate",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Trường / cơ sở đào tạo"
                          value={
                            item.school ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEducation(
                              index,
                              "school",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Chuyên ngành / chứng chỉ"
                          value={
                            item.majorOrCertificate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEducation(
                              index,
                              "majorOrCertificate",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Bằng cấp / chứng chỉ"
                          value={
                            item.degreeOrCertificate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEducation(
                              index,
                              "degreeOrCertificate",
                              value,
                            )
                          }
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              education:
                                previous.education.filter(
                                  (
                                    _,
                                    itemIndex,
                                  ) =>
                                    itemIndex !==
                                    index,
                                ),
                            }),
                          )
                        }
                        className="mt-4 text-xs font-medium text-red-500"
                      >
                        Xóa quá trình
                      </button>
                    </div>
                  ),
                )}

                {form.education
                  .length === 0 && (
                  <EmptyArrayState text="Chưa có thông tin học tập / đào tạo." />
                )}
              </div>
            )}

            {/* ===========================================
                EXPERIENCE
            =========================================== */}

            {activeTab ===
              "experience" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <SectionTitle>
                    Kinh nghiệm làm việc
                  </SectionTitle>

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          workExperience:
                            [
                              ...previous.workExperience,
                              {},
                            ],
                        }),
                      )
                    }
                    className="text-sm font-medium text-blue-600"
                  >
                    + Thêm kinh nghiệm
                  </button>
                </div>

                {form.workExperience.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          label="Từ ngày"
                          type="date"
                          value={
                            item.fromDate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateExperience(
                              index,
                              "fromDate",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Đến ngày"
                          type="date"
                          value={
                            item.toDate ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateExperience(
                              index,
                              "toDate",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Công ty"
                          value={
                            item.company ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateExperience(
                              index,
                              "company",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Chức vụ"
                          value={
                            item.position ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateExperience(
                              index,
                              "position",
                              value,
                            )
                          }
                        />

                        <Input
                          label="Loại hình làm việc"
                          value={
                            item.employmentType ||
                            ""
                          }
                          onChange={(
                            value,
                          ) =>
                            updateExperience(
                              index,
                              "employmentType",
                              value,
                            )
                          }
                        />

                        <div className="md:col-span-2">
                          <Textarea
                            label="Nhiệm vụ chính"
                            value={
                              item.responsibilities ||
                              ""
                            }
                            onChange={(
                              value,
                            ) =>
                              updateExperience(
                                index,
                                "responsibilities",
                                value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              workExperience:
                                previous.workExperience.filter(
                                  (
                                    _,
                                    itemIndex,
                                  ) =>
                                    itemIndex !==
                                    index,
                                ),
                            }),
                          )
                        }
                        className="mt-4 text-xs font-medium text-red-500"
                      >
                        Xóa kinh nghiệm
                      </button>
                    </div>
                  ),
                )}

                {form.workExperience
                  .length === 0 && (
                  <EmptyArrayState text="Chưa có kinh nghiệm làm việc." />
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}

              {saving
                ? "Đang lưu..."
                : editingEmployee
                  ? "Lưu thay đổi"
                  : "Thêm nhân viên"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


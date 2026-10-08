import type {
  Employee,
  EmployeeForm,
  EmployeeStatus,
} from "../types";

import { STATUS_OPTIONS } from "../constants";

const getToken = () => {
  return localStorage.getItem("token");
};

const getHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

const formatDate = (date?: string) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("vi-VN");
};

const formatMoney = (value?: number) => {
  if (
    value === undefined ||
    value === null ||
    Number.isNaN(Number(value))
  ) {
    return "-";
  }

  return Number(value).toLocaleString("vi-VN") + " ₫";
};

const getStatusLabel = (status?: EmployeeStatus) => {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === status,
    )?.label || status || "-"
  );
};

const getStatusClass = (
  status?: EmployeeStatus,
) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "PROBATION":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ON_LEAVE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "RESIGNED":
      return "bg-slate-100 text-slate-600 border-slate-200";

    case "TERMINATED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const toInputDate = (date?: string) => {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toISOString().split("T")[0];
};

const numberOrZero = (value: string) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const employeeToForm = (
  employee: Employee,
): EmployeeForm => {
  return {
    name: employee.name || "",
    phone: employee.phone || "",
    email: employee.email || "",

    avatarUrl:
      employee.avatar?.url || "",

    dateOfBirth: toInputDate(
      employee.personalInfo?.dateOfBirth,
    ),

    placeOfBirth:
      employee.personalInfo?.placeOfBirth || "",

    hometown:
      employee.personalInfo?.hometown || "",

    idCardNumber:
      employee.personalInfo?.idCardNumber || "",

    idCardIssueDate: toInputDate(
      employee.personalInfo?.idCardIssueDate,
    ),

    idCardIssuePlace:
      employee.personalInfo?.idCardIssuePlace || "",

    nationality:
      employee.personalInfo?.nationality ||
      "Việt Nam",

    ethnicity:
      employee.personalInfo?.ethnicity || "",

    gender:
      employee.personalInfo?.gender || "",

    maritalStatus:
      employee.personalInfo?.maritalStatus ||
      "",

    permanentAddress:
      employee.personalInfo?.permanentAddress ||
      "",

    currentAddress:
      employee.personalInfo?.currentAddress ||
      "",

    emergencyName:
      employee.personalInfo?.emergencyContact
        ?.name || "",

    emergencyRelationship:
      employee.personalInfo?.emergencyContact
        ?.relationship || "",

    emergencyPhone:
      employee.personalInfo?.emergencyContact
        ?.phone || "",

    emergencyAddress:
      employee.personalInfo?.emergencyContact
        ?.address || "",

    employeeCode:
      employee.workInfo?.employeeCode || "",

    startDate: toInputDate(
      employee.workInfo?.startDate,
    ),

    position:
      employee.workInfo?.position || "",

    department:
      employee.workInfo?.department || "",

    contractNumber:
      employee.contractInfo?.contractNumber ||
      "",

    contractType:
      employee.contractInfo?.contractType ||
      "",

    contractStartDate: toInputDate(
      employee.contractInfo?.contractStartDate,
    ),

    contractEndDate: toInputDate(
      employee.contractInfo?.contractEndDate,
    ),

    probationStartDate: toInputDate(
      employee.contractInfo?.probationStartDate,
    ),

    probationEndDate: toInputDate(
      employee.contractInfo?.probationEndDate,
    ),

    contractNotes:
      employee.contractInfo?.notes || "",

    taxCode:
      employee.salaryAndBenefits?.taxCode ||
      "",

    dependents:
      String(
        employee.salaryAndBenefits?.dependents ??
        0,
      ),

    socialInsuranceNumber:
      employee.salaryAndBenefits
        ?.socialInsuranceNumber || "",

    insuranceSalary: String(
      employee.salaryAndBenefits
        ?.insuranceSalary ?? 0,
    ),

    baseSalary: String(
      employee.salaryAndBenefits?.baseSalary ??
      0,
    ),

    paymentMethod:
      employee.salaryAndBenefits
        ?.paymentMethod || "",

    bankName:
      employee.salaryAndBenefits?.bankName ||
      "",

    bankBranch:
      employee.salaryAndBenefits?.bankBranch ||
      "",

    bankAccountNumber:
      employee.salaryAndBenefits
        ?.bankAccountNumber || "",

    paymentPeriod:
      employee.salaryAndBenefits
        ?.paymentPeriod || "",

    mealRate:
      employee.salaryAndBenefits?.mealRate !==
      undefined
        ? String(
            employee.salaryAndBenefits.mealRate,
          )
        : "",

    bonusGeneral: String(
      employee.salaryAndBenefits?.bonuses
        ?.general ?? 0,
    ),

    bonusPerformance: String(
      employee.salaryAndBenefits?.bonuses
        ?.performance ?? 0,
    ),

    bonusResponsibility: String(
      employee.salaryAndBenefits?.bonuses
        ?.responsibility ?? 0,
    ),

    status:
      employee.status || "ACTIVE",

    notes: employee.notes || "",

    familyMembers:
      employee.personalInfo?.familyMembers?.map(
        (item) => ({
          name: item.name || "",
          relationship:
            item.relationship || "",
          birthYear: item.birthYear,
          occupation:
            item.occupation || "",
        }),
      ) || [],

    education:
      employee.education?.map((item) => ({
        fromDate: toInputDate(
          item.fromDate,
        ),
        toDate: toInputDate(item.toDate),
        majorOrCertificate:
          item.majorOrCertificate || "",
        school: item.school || "",
        degreeOrCertificate:
          item.degreeOrCertificate || "",
      })) || [],

    workExperience:
      employee.workExperience?.map(
        (item) => ({
          fromDate: toInputDate(
            item.fromDate,
          ),
          toDate: toInputDate(item.toDate),
          company: item.company || "",
          position: item.position || "",
          responsibilities:
            item.responsibilities || "",
          employmentType:
            item.employmentType || "",
        }),
      ) || [],
  };
};

const formToPayload = (
  form: EmployeeForm,
) => {
  return {
    name: form.name.trim(),

    phone:
      form.phone.trim() || undefined,

    email:
      form.email.trim() || undefined,

    avatar: form.avatarUrl.trim()
      ? {
          url: form.avatarUrl.trim(),
        }
      : undefined,

    personalInfo: {
      dateOfBirth:
        form.dateOfBirth || undefined,

      placeOfBirth:
        form.placeOfBirth.trim() ||
        undefined,

      hometown:
        form.hometown.trim() ||
        undefined,

      idCardNumber:
        form.idCardNumber.trim() ||
        undefined,

      idCardIssueDate:
        form.idCardIssueDate || undefined,

      idCardIssuePlace:
        form.idCardIssuePlace.trim() ||
        undefined,

      nationality:
        form.nationality.trim() ||
        "Việt Nam",

      ethnicity:
        form.ethnicity.trim() ||
        undefined,

      gender:
        form.gender || undefined,

      maritalStatus:
        form.maritalStatus || undefined,

      permanentAddress:
        form.permanentAddress.trim() ||
        undefined,

      currentAddress:
        form.currentAddress.trim() ||
        undefined,

      emergencyContact:
        form.emergencyName.trim() ||
        form.emergencyPhone.trim()
          ? {
              name:
                form.emergencyName.trim() ||
                undefined,

              relationship:
                form.emergencyRelationship.trim() ||
                undefined,

              phone:
                form.emergencyPhone.trim() ||
                undefined,

              address:
                form.emergencyAddress.trim() ||
                undefined,
            }
          : undefined,

      familyMembers:
        form.familyMembers.filter(
          (item) =>
            item.name?.trim() ||
            item.relationship?.trim() ||
            item.occupation?.trim(),
        ),
    },

    workInfo: {
      employeeCode:
        form.employeeCode.trim() ||
        undefined,

      startDate:
        form.startDate || undefined,

      position:
        form.position.trim() ||
        undefined,

      department:
        form.department.trim() ||
        undefined,
    },

    contractInfo: {
      contractNumber:
        form.contractNumber.trim() ||
        undefined,

      contractType:
        form.contractType.trim() ||
        undefined,

      contractStartDate:
        form.contractStartDate || undefined,

      contractEndDate:
        form.contractEndDate || undefined,

      probationStartDate:
        form.probationStartDate || undefined,

      probationEndDate:
        form.probationEndDate || undefined,

      notes:
        form.contractNotes.trim() ||
        undefined,
    },

    salaryAndBenefits: {
      taxCode:
        form.taxCode.trim() ||
        undefined,

      dependents:
        numberOrZero(form.dependents),

      socialInsuranceNumber:
        form.socialInsuranceNumber.trim() ||
        undefined,

      insuranceSalary:
        numberOrZero(form.insuranceSalary),

      baseSalary:
        numberOrZero(form.baseSalary),

      paymentMethod:
        form.paymentMethod.trim() ||
        undefined,

      bankName:
        form.bankName.trim() ||
        undefined,

      bankBranch:
        form.bankBranch.trim() ||
        undefined,

      bankAccountNumber:
        form.bankAccountNumber.trim() ||
        undefined,

      paymentPeriod:
        form.paymentPeriod.trim() ||
        undefined,

      ...(form.mealRate.trim()
        ? {
            mealRate: numberOrZero(
              form.mealRate,
            ),
          }
        : {}),

      bonuses: {
        general: numberOrZero(
          form.bonusGeneral,
        ),

        performance: numberOrZero(
          form.bonusPerformance,
        ),

        responsibility: numberOrZero(
          form.bonusResponsibility,
        ),
      },
    },

    education: form.education.filter(
      (item) =>
        item.school?.trim() ||
        item.majorOrCertificate?.trim() ||
        item.degreeOrCertificate?.trim(),
    ),

    workExperience:
      form.workExperience.filter(
        (item) =>
          item.company?.trim() ||
          item.position?.trim() ||
          item.responsibilities?.trim(),
      ),

    status: form.status,

    notes:
      form.notes.trim() || undefined,
  };
};

export {
  getToken,
  getHeaders,
  formatDate,
  formatMoney,
  getStatusLabel,
  getStatusClass,
  toInputDate,
  numberOrZero,
  employeeToForm,
  formToPayload,
};
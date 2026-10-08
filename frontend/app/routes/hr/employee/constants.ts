import type { EmployeeForm, EmployeeStatus } from "./types";

export const STATUS_OPTIONS: {
  value: EmployeeStatus;
  label: string;
}[] = [
  {
    value: "ACTIVE",
    label: "Đang làm việc",
  },
  {
    value: "PROBATION",
    label: "Thử việc",
  },
  {
    value: "ON_LEAVE",
    label: "Nghỉ phép",
  },
  {
    value: "RESIGNED",
    label: "Đã nghỉ việc",
  },
  {
    value: "TERMINATED",
    label: "Đã chấm dứt",
  },
];

export const GENDER_OPTIONS = [
  {
    value: "MALE",
    label: "Nam",
  },
  {
    value: "FEMALE",
    label: "Nữ",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

export const MARITAL_OPTIONS = [
  {
    value: "SINGLE",
    label: "Độc thân",
  },
  {
    value: "MARRIED",
    label: "Đã kết hôn",
  },
  {
    value: "DIVORCED",
    label: "Đã ly hôn",
  },
  {
    value: "WIDOWED",
    label: "Góa",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

export const EMPTY_FORM: EmployeeForm = {
  name: "",
  phone: "",
  email: "",

  avatarUrl: "",

  dateOfBirth: "",
  placeOfBirth: "",
  hometown: "",

  idCardNumber: "",
  idCardIssueDate: "",
  idCardIssuePlace: "",

  nationality: "Việt Nam",
  ethnicity: "",
  gender: "",
  maritalStatus: "",

  permanentAddress: "",
  currentAddress: "",

  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  emergencyAddress: "",

  employeeCode: "",
  startDate: "",
  position: "",
  department: "",

  contractNumber: "",
  contractType: "",
  contractStartDate: "",
  contractEndDate: "",
  probationStartDate: "",
  probationEndDate: "",
  contractNotes: "",

  taxCode: "",
  dependents: "0",
  socialInsuranceNumber: "",

  insuranceSalary: "0",
  baseSalary: "0",

  paymentMethod: "",

  bankName: "",
  bankBranch: "",
  bankAccountNumber: "",

  paymentPeriod: "",
  mealRate: "",

  bonusGeneral: "0",
  bonusPerformance: "0",
  bonusResponsibility: "0",

  status: "ACTIVE",

  notes: "",

  familyMembers: [],
  education: [],
  workExperience: [],
};
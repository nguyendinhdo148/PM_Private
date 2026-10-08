export type EmployeeStatus =
  | "ACTIVE"
  | "PROBATION"
  | "ON_LEAVE"
  | "RESIGNED"
  | "TERMINATED";

export type FamilyMember = {
  name?: string;
  relationship?: string;
  birthYear?: number;
  occupation?: string;
};

export type EmergencyContact = {
  name?: string;
  relationship?: string;
  address?: string;
  phone?: string;
};

export type Education = {
  fromDate?: string;
  toDate?: string;
  majorOrCertificate?: string;
  school?: string;
  degreeOrCertificate?: string;
};

export type WorkExperience = {
  fromDate?: string;
  toDate?: string;
  company?: string;
  position?: string;
  responsibilities?: string;
  employmentType?: string;
};

export type Employee = {
  _id: string;

  name: string;
  phone?: string;
  email?: string;

  avatar?: {
    url?: string;
    publicId?: string;
  };

  personalInfo?: {
    dateOfBirth?: string;
    placeOfBirth?: string;
    hometown?: string;

    idCardNumber?: string;
    idCardIssueDate?: string;
    idCardIssuePlace?: string;

    nationality?: string;
    ethnicity?: string;

    gender?: string;
    maritalStatus?: string;

    permanentAddress?: string;
    currentAddress?: string;

    familyMembers?: FamilyMember[];

    emergencyContact?: EmergencyContact;
  };

  workInfo?: {
    employeeCode?: string;
    startDate?: string;
    position?: string;
    department?: string;
  };

  contractInfo?: {
    contractNumber?: string;
    contractType?: string;
    contractStartDate?: string;
    contractEndDate?: string;

    probationStartDate?: string;
    probationEndDate?: string;

    notes?: string;
  };

  salaryAndBenefits?: {
    taxCode?: string;
    dependents?: number;

    socialInsuranceNumber?: string;

    insuranceSalary?: number;
    baseSalary?: number;

    paymentMethod?: string;

    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;

    paymentPeriod?: string;

    mealRate?: number;

    bonuses?: {
      general?: number;
      performance?: number;
      responsibility?: number;
    };
  };

  education?: Education[];
  workExperience?: WorkExperience[];

  status: EmployeeStatus;

  notes?: string;

  workingDuration?: {
    years: number;
    months: number;
    text: string;
  } | null;

  currentContractStatus?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeForm = {
  name: string;
  phone: string;
  email: string;

  avatarUrl: string;

  dateOfBirth: string;
  placeOfBirth: string;
  hometown: string;

  idCardNumber: string;
  idCardIssueDate: string;
  idCardIssuePlace: string;

  nationality: string;
  ethnicity: string;
  gender: string;
  maritalStatus: string;

  permanentAddress: string;
  currentAddress: string;

  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyAddress: string;

  employeeCode: string;
  startDate: string;
  position: string;
  department: string;

  contractNumber: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate: string;
  probationStartDate: string;
  probationEndDate: string;
  contractNotes: string;

  taxCode: string;
  dependents: string;
  socialInsuranceNumber: string;

  insuranceSalary: string;
  baseSalary: string;

  paymentMethod: string;

  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;

  paymentPeriod: string;
  mealRate: string;

  bonusGeneral: string;
  bonusPerformance: string;
  bonusResponsibility: string;

  status: EmployeeStatus;

  notes: string;

  familyMembers: FamilyMember[];
  education: Education[];
  workExperience: WorkExperience[];
};